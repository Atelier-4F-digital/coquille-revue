<?php
// Files of the public interface and of the admin page: loaded only where they are allowed, with a configuration
// that gives a REST token to logged-in users only and can never close its script tag.
class Test_Coquille_Revue_Assets extends Coquille_Revue_Test_Case {

    // Data block of the configuration, whatever the order of its attributes (WordPress 7 writes id first).
    const CONFIG_BLOCK = '~<script(?=[^>]*\bid="coquille-revue-config")(?=[^>]*\btype="application/json")[^>]*>(.*?)</script>~s';

    public function tear_down() {
        remove_all_filters('coquille_revue_load_overlay');
        remove_all_filters('gettext');
        $GLOBALS['wp_scripts']     = new WP_Scripts();
        $GLOBALS['wp_styles']      = new WP_Styles();
        $GLOBALS['current_screen'] = null;
        parent::tear_down();
    }

    private function enqueue_front($user) {
        wp_set_current_user($user);
        $GLOBALS['wp_scripts'] = new WP_Scripts();
        $GLOBALS['wp_styles']  = new WP_Styles();
        do_action('wp_enqueue_scripts');
        return wp_script_is('coquille-revue-overlay', 'enqueued') && wp_style_is('coquille-revue-overlay', 'enqueued');
    }

    private function render() {
        ob_start();
        coquille_revue_render_overlay();
        return ob_get_clean();
    }

    // Configuration printed in the JSON data block, never in an inline script that browsers would run.
    private function front_config() {
        $this->assertEmpty(wp_scripts()->get_data('coquille-revue-overlay', 'before'), 'no inline JavaScript');
        $html = $this->render();
        $this->assertSame(1, preg_match(self::CONFIG_BLOCK, $html, $m));
        return json_decode($m[1], true);
    }

    public function test_public_interface_is_loaded_only_where_allowed() {
        // Private mode (default): contributors and above only.
        $this->assertFalse($this->enqueue_front(0), 'private mode: visitor');
        $this->assertFalse($this->enqueue_front(self::factory()->user->create(['role' => 'subscriber'])), 'private mode: subscriber');
        $this->assertTrue($this->enqueue_front(self::factory()->user->create(['role' => 'contributor'])), 'private mode: contributor');
        $config = $this->front_config();
        $this->assertNotSame('', $config['nonce']);
        $this->assertTrue($config['shortcut']);

        // Public mode: visitors get the interface, without REST token or keyboard shortcut.
        $this->set_public_mode();
        $this->assertTrue($this->enqueue_front(0), 'public mode: visitor');
        $config = $this->front_config();
        $this->assertSame('', $config['nonce']);
        $this->assertFalse($config['shortcut']);

        // Filter, and no markup without the script.
        add_filter('coquille_revue_load_overlay', '__return_false');
        $this->assertFalse($this->enqueue_front(0), 'filter');
        ob_start();
        coquille_revue_render_overlay();
        $this->assertSame('', ob_get_clean());
    }

    public function test_markup_escapes_the_display_name_and_carries_no_html_comment() {
        $user = self::factory()->user->create(['role' => 'editor', 'display_name' => '"><img src=x onerror=alert(1)>']);
        $this->assertTrue($this->enqueue_front($user));
        ob_start();
        coquille_revue_render_overlay();
        $html = ob_get_clean();
        $this->assertStringContainsString('id="coquille-fab"', $html);
        $this->assertStringNotContainsString('<img src=x', $html);
        $this->assertStringNotContainsString('<!--', $html);
    }

    public function test_configuration_block_cannot_open_or_close_a_script_tag() {
        $this->set_public_mode();
        $evil = '</script><script>alert(1)</script><!-- \' " &amp;';
        add_filter('gettext', function ($translation, $text, $domain) use ($evil) {
            return $domain === 'coquille-revue' ? $evil : $translation;
        }, 10, 3);
        $this->assertTrue($this->enqueue_front(0));
        $html = $this->render();
        $this->assertSame(1, preg_match(self::CONFIG_BLOCK, $html, $m));
        foreach (['<', '>', '&', "'"] as $char) {
            $this->assertStringNotContainsString($char, $m[1], 'escaped in the data: ' . $char);
        }
        $this->assertStringContainsString(chr(92) . 'u0022', $m[1], 'quotes inside the texts are escaped');
        $this->assertSame($evil, json_decode($m[1], true)['i18n']['send'], 'the text itself is intact');
        $this->assertStringNotContainsString('<script>alert(1)', $html);
    }

    public function test_admin_files_only_on_the_plugin_page() {
        require_once ABSPATH . 'wp-admin/includes/class-wp-screen.php';
        require_once ABSPATH . 'wp-admin/includes/screen.php';
        wp_set_current_user(self::factory()->user->create(['role' => 'administrator']));
        // A current screen is needed: a core callback of admin_enqueue_scripts reads it.
        foreach (['index.php' => ['dashboard', false], 'edit.php' => ['edit-post', false], 'toplevel_page_coquille-revue' => ['toplevel_page_coquille-revue', true]] as $hook => [$screen, $expected]) {
            set_current_screen($screen);
            $GLOBALS['wp_scripts'] = new WP_Scripts();
            $GLOBALS['wp_styles']  = new WP_Styles();
            do_action('admin_enqueue_scripts', $hook);
            $this->assertSame($expected, wp_style_is('coquille-revue-admin', 'enqueued'), $hook);
            $this->assertSame($expected, wp_script_is('coquille-revue-admin', 'enqueued'), $hook);
        }
    }
}
