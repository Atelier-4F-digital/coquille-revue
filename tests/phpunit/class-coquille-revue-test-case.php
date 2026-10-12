<?php
// Shared helpers: REST calls as the script of the page sends them, rows written straight into the table, sent emails.
abstract class Coquille_Revue_Test_Case extends WP_UnitTestCase {

    // Emoji flags written out: black flag U+1F3F4, one Tag character per letter of the code (U+E0061 is "a",
    // U+E0031 is "1"…), then U+E007F. Only gbeng, gbsct and gbwls are flags that systems show; the others hide words.
    const FLAGS = [
        'gbeng'   => "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
        'gbsct'   => "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
        'gbwls'   => "\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}",
        'gbeng1'  => "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E0031}\u{E007F}",
        'fridf'   => "\u{1F3F4}\u{E0066}\u{E0072}\u{E0069}\u{E0064}\u{E0066}\u{E007F}",
        'ignore'  => "\u{1F3F4}\u{E0069}\u{E0067}\u{E006E}\u{E006F}\u{E0072}\u{E0065}\u{E007F}",
        'allrule' => "\u{1F3F4}\u{E0061}\u{E006C}\u{E006C}\u{E0072}\u{E0075}\u{E006C}\u{E0065}\u{E007F}",
        'sdelete' => "\u{1F3F4}\u{E0073}\u{E0064}\u{E0065}\u{E006C}\u{E0065}\u{E0074}\u{E0065}\u{E007F}",
        'footer'  => "\u{1F3F4}\u{E0066}\u{E006F}\u{E006F}\u{E0074}\u{E0065}\u{E0072}\u{E007F}",
    ];

    public function set_up() {
        parent::set_up();
        $GLOBALS['wp_rest_server'] = null;
        $_SERVER['REMOTE_ADDR'] = '192.0.2.10';
        wp_set_current_user(0);
        reset_phpmailer_instance();
    }

    public function tear_down() {
        $GLOBALS['wp_rest_server'] = null;
        parent::tear_down();
    }

    protected function set_public_mode() {
        update_site_option('coquille_revue_require_login', 0);
    }

    // Fields of a text annotation on the home page, as overlay.js sends them.
    protected function annotation_params($extra = []) {
        return array_merge([
            'url'             => home_url('/'),
            'pageTitle'       => 'Home',
            'xpath'           => '/html/body[1]/main[1]/p[1]',
            'cssSelector'     => 'main > p',
            'charOffsetStart' => 0,
            'charOffsetEnd'   => 23,
            'originalText'    => 'Bienvenu sur notre site',
            'suggestion'      => 'Bienvenue sur notre site',
            'type'            => 'correction',
            'annotationMode'  => 'text',
            'hp'              => '',
        ], $extra);
    }

    protected function rest($method, $route, $params = null) {
        $request = new WP_REST_Request($method, '/coquille-revue/v1' . $route);
        if ($params !== null) {
            $request->set_header('Content-Type', 'application/json');
            $request->set_body(wp_json_encode($params));
        }
        return rest_do_request($request);
    }

    protected function post_annotation($extra = []) {
        return $this->rest('POST', '/annotation', $this->annotation_params($extra));
    }

    protected function insert_annotation($fields = []) {
        global $wpdb;
        $wpdb->insert(coquille_revue_table(), array_merge([
            'blog_id'         => get_current_blog_id(),
            'url'             => home_url('/'),
            'page_title'      => 'Home',
            'xpath'           => '/html/body[1]/main[1]/p[1]',
            'css_selector'    => 'main > p',
            'original_text'   => 'Bienvenu sur notre site',
            'suggestion'      => 'Bienvenue sur notre site',
            'type'            => 'correction',
            'annotation_mode' => 'text',
            'author_id'       => 0,
            'author_name'     => 'Marie',
            'reviewer_name'   => 'Marie',
            'reviewer_email'  => null,
            'reviewer_ip'     => '192.0.2.10',
            'status'          => 'pending',
            'created_at'      => current_time('mysql', true),
            'dates_utc'       => 1,
        ], $fields));
        return (int) $wpdb->insert_id;
    }

    protected function get_annotation($id) {
        global $wpdb;
        return $wpdb->get_row($wpdb->prepare('SELECT * FROM %i WHERE id = %d', coquille_revue_table(), $id), ARRAY_A);
    }

    protected function last_annotation() {
        global $wpdb;
        return $wpdb->get_row($wpdb->prepare('SELECT * FROM %i ORDER BY id DESC LIMIT 1', coquille_revue_table()), ARRAY_A);
    }

    protected function sent_mails() {
        return tests_retrieve_phpmailer_instance()->mock_sent;
    }
}
