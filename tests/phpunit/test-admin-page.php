<?php
// Admin page rendering: page number, pagination links, labels shown instead of stored markers, alerts.
class Test_Coquille_Revue_Admin_Page extends Coquille_Revue_Test_Case {

    public function set_up() {
        parent::set_up();
        wp_set_current_user(self::factory()->user->create(['role' => 'administrator']));
    }

    public function tear_down() {
        $_GET = [];
        parent::tear_down();
    }

    private function render($query) {
        $_GET                   = $query;
        $_SERVER['REQUEST_URI'] = '/wp-admin/admin.php?' . http_build_query($query);
        ob_start();
        coquille_revue_admin_page();
        return ob_get_clean();
    }

    public function test_negative_page_number_shows_the_first_page() {
        $ids = [];
        for ($i = 0; $i < COQUILLE_REVUE_ADMIN_PER_PAGE + 5; $i++) {
            $ids[] = $this->insert_annotation();
        }
        $html = $this->render(['page' => 'coquille-revue', 'paged' => '-5']);
        $this->assertStringContainsString('<td>' . end($ids) . '</td>', $html, 'newest annotation, on page 1');
        $this->assertStringNotContainsString('<td>' . $ids[0] . '</td>', $html, 'oldest annotation, on page 2');
    }

    public function test_pagination_links_drop_the_action_message() {
        for ($i = 0; $i < COQUILLE_REVUE_ADMIN_PER_PAGE + 1; $i++) {
            $this->insert_annotation();
        }
        $html = $this->render(['page' => 'coquille-revue', 'coquille_revue_msg' => 'settings_saved']);
        $this->assertStringContainsString('notice-success', $html, 'the message is shown once');
        $this->assertGreaterThan(0, preg_match_all('~class="page-numbers" href="([^"]+)"~', $html, $links), 'pagination links');
        foreach ($links[1] as $link) {
            $this->assertStringContainsString('paged=2', html_entity_decode($link));
            $this->assertStringNotContainsString('coquille_revue_msg', html_entity_decode($link));
        }
    }

    public function test_area_without_text_shows_a_translated_label() {
        $this->insert_annotation(['annotation_mode' => 'zone', 'original_text' => '(zone without text)']);
        $html = $this->render(['page' => 'coquille-revue']);
        $this->assertStringContainsString('(area without text)', $html);
        $this->assertStringNotContainsString('(zone without text)', $html);
        // The export for Claude Code keeps the stored value.
        $this->assertSame('(zone without text)', coquille_revue_json_row(coquille_revue_get_rows('pending')[0])['original_text']);
    }

    public function test_alerts_are_shown_under_the_suggestion() {
        $this->insert_annotation(['suggestion' => 'Voir evil.ru']);
        $html = $this->render(['page' => 'coquille-revue']);
        $this->assertMatchesRegularExpression('~<td class="coquille-revue-suggestion"[^>]*>Voir evil\.ru<span class="coquille-revue-alerts">.*web address</span></td>~s', $html);
    }
}
