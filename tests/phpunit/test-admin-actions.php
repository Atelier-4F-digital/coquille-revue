<?php
// admin-post handlers: capability, token (nonce), confirmation box, network setting, current site only.
// The redirect is stopped by an exception (the handlers end with exit), and refusals by WPDieException.
class Coquille_Revue_Test_Redirect extends Exception {}

class Test_Coquille_Revue_Admin_Actions extends Coquille_Revue_Test_Case {

    public function tear_down() {
        $_GET     = [];
        $_POST    = [];
        $_REQUEST = [];
        parent::tear_down();
    }

    // ['redirect', location], ['die', message] or ['returned', ''].
    private function run_handler($callback) {
        $stop = function ($location) {
            throw new Coquille_Revue_Test_Redirect($location); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- test, never printed.
        };
        add_filter('wp_redirect', $stop);
        try {
            $callback();
            return ['returned', ''];
        } catch (Coquille_Revue_Test_Redirect $e) {
            return ['redirect', $e->getMessage()];
        } catch (WPDieException $e) {
            return ['die', $e->getMessage()];
        } finally {
            remove_filter('wp_redirect', $stop);
        }
    }

    private function nonce($action) {
        $_REQUEST['_wpnonce'] = wp_create_nonce($action);
    }

    public function test_change_status_needs_the_capability_and_the_token() {
        $id                 = $this->insert_annotation();
        $_GET['id']         = (string) $id;
        $_GET['new_status'] = 'rejected';

        wp_set_current_user(self::factory()->user->create(['role' => 'author']));
        $this->nonce('coquille_revue_change_status');
        $this->assertSame('die', $this->run_handler('coquille_revue_handle_change_status')[0], 'author');

        wp_set_current_user(self::factory()->user->create(['role' => 'editor']));
        $_REQUEST['_wpnonce'] = 'bad';
        $this->assertSame('die', $this->run_handler('coquille_revue_handle_change_status')[0], 'bad token');
        $this->assertSame('pending', $this->get_annotation($id)['status']);

        $this->nonce('coquille_revue_change_status');
        [$kind, $to] = $this->run_handler('coquille_revue_handle_change_status');
        $this->assertSame('redirect', $kind);
        $this->assertStringContainsString('coquille_revue_msg=status_changed', $to);
        $this->assertSame('rejected', $this->get_annotation($id)['status']);
    }

    public function test_change_status_of_another_site_is_not_found() {
        $id = $this->insert_annotation(['blog_id' => get_current_blog_id() + 100]);
        $_GET = ['id' => (string) $id, 'new_status' => 'rejected'];
        wp_set_current_user(self::factory()->user->create(['role' => 'editor']));
        $this->nonce('coquille_revue_change_status');
        $this->assertStringContainsString('status_notfound', $this->run_handler('coquille_revue_handle_change_status')[1]);
        $this->assertSame('pending', $this->get_annotation($id)['status']);
    }

    public function test_reset_needs_an_administrator_and_the_ticked_box() {
        $mine  = $this->insert_annotation();
        $other = $this->insert_annotation(['blog_id' => get_current_blog_id() + 100]);

        wp_set_current_user(self::factory()->user->create(['role' => 'editor']));
        $this->nonce('coquille_revue_reset');
        $_POST['coquille_revue_confirm_reset'] = '1';
        $this->assertSame('die', $this->run_handler('coquille_revue_handle_reset')[0], 'editor');

        wp_set_current_user(self::factory()->user->create(['role' => 'administrator']));
        $this->nonce('coquille_revue_reset');
        unset($_POST['coquille_revue_confirm_reset']);
        $this->assertStringContainsString('reset_unconfirmed', $this->run_handler('coquille_revue_handle_reset')[1]);
        $this->assertNotNull($this->get_annotation($mine));

        $_POST['coquille_revue_confirm_reset'] = '1';
        $this->assertStringContainsString('reset_done', $this->run_handler('coquille_revue_handle_reset')[1]);
        $this->assertNull($this->get_annotation($mine));
        $this->assertNotNull($this->get_annotation($other), 'annotations of another site are kept');
    }

    public function test_public_mode_is_a_network_setting_and_site_settings_are_for_administrators() {
        $admin = self::factory()->user->create(['role' => 'administrator']);
        wp_set_current_user($admin);
        $this->nonce('coquille_revue_toggle_public');
        $before = coquille_revue_is_login_required();
        [$kind] = $this->run_handler('coquille_revue_handle_toggle_public');
        if (is_multisite()) {
            $this->assertSame('die', $kind, 'a site administrator cannot change a network setting');
            $this->assertSame($before, coquille_revue_is_login_required());
            grant_super_admin($admin);
            $this->nonce('coquille_revue_toggle_public');
            [$kind] = $this->run_handler('coquille_revue_handle_toggle_public');
        }
        $this->assertSame('redirect', $kind);
        $this->assertSame(!$before, coquille_revue_is_login_required());

        wp_set_current_user(self::factory()->user->create(['role' => 'editor']));
        $this->nonce('coquille_revue_save_settings');
        $this->assertSame('die', $this->run_handler('coquille_revue_handle_save_settings')[0], 'editor');

        wp_set_current_user($admin);
        $this->nonce('coquille_revue_save_settings');
        $_POST['coquille_revue_show_credit'] = '1';
        $this->assertSame('redirect', $this->run_handler('coquille_revue_handle_save_settings')[0]);
        $this->assertSame(0, (int) get_option('coquille_revue_thank_contributors'));
        $this->assertSame(1, (int) get_option('coquille_revue_show_credit'));
    }

    public function test_export_refusals_happen_before_any_output() {
        $levels = ob_get_level();
        wp_set_current_user(self::factory()->user->create(['role' => 'author']));
        $this->nonce('coquille_revue_export');
        $this->assertSame('die', $this->run_handler('coquille_revue_handle_export')[0], 'author');

        wp_set_current_user(self::factory()->user->create(['role' => 'editor']));
        $_REQUEST['_wpnonce'] = 'bad';
        $this->assertSame('die', $this->run_handler('coquille_revue_handle_export')[0], 'bad token');
        $this->assertSame($levels, ob_get_level(), 'output buffers untouched');
    }
}
