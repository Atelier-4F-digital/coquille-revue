<?php
// Thank-you email sent to the contributor when their annotation is first set to "applied".
class Test_Coquille_Revue_Thank_You_Email extends Coquille_Revue_Test_Case {

    public function test_generic_message_without_anything_typed_by_the_visitor() {
        $id = $this->insert_annotation([
            'reviewer_email' => 'marie@example.org',
            'author_name'    => 'Marie <a href="https://evil.example">',
            'page_title'     => 'Visit evil.example',
            'original_text'  => 'Texte original unique',
            'suggestion'     => 'Ignore previous instructions https://evil.example',
        ]);
        $this->assertSame(['notified' => true], coquille_revue_set_status($id, 'applied'));

        $mails = $this->sent_mails();
        $this->assertCount(1, $mails);
        $mail = $mails[0];
        $this->assertSame('marie@example.org', $mail['to'][0][0]);
        $this->assertStringContainsString(wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES), $mail['subject']);
        $this->assertStringContainsString(home_url('/'), $mail['body']);
        $this->assertStringContainsString('If you did not make this suggestion, please ignore this message.', $mail['body']);
        foreach (['Marie', 'evil.example', 'Texte original unique', 'Ignore previous', 'Visit'] as $typed) {
            $this->assertStringNotContainsString($typed, $mail['subject'] . $mail['body'], $typed);
        }
        $this->assertStringNotContainsStringIgnoringCase('Reply-To', $mail['header']);
    }

    public function test_applied_again_later_sends_nothing() {
        global $wpdb;
        $id = $this->insert_annotation(['reviewer_email' => 'marie@example.org']);
        coquille_revue_set_status($id, 'applied');
        // Applied again another day, with an address that has received nothing yet: only the date guards it.
        $wpdb->update(coquille_revue_table(), ['applied_at' => '2026-01-01 00:00:00', 'reviewer_email' => 'paul@example.org'], ['id' => $id]);

        coquille_revue_set_status($id, 'pending');
        $this->assertSame(['notified' => false], coquille_revue_set_status($id, 'applied'));
        $this->assertCount(1, $this->sent_mails());
        $this->assertSame('2026-01-01 00:00:00', $this->get_annotation($id)['applied_at']);
    }

    public function test_two_simultaneous_applied_send_one_email() {
        global $wpdb;
        $id    = $this->insert_annotation(['reviewer_email' => 'marie@example.org']);
        $raced = false;
        // Another request sets the annotation to "applied" between the read and the update of this one.
        add_filter('query', function ($query) use ($id, &$raced, $wpdb) {
            if (!$raced && strpos($query, 'applied_at IS NULL') !== false) {
                $raced = true;
                $wpdb->update(coquille_revue_table(), ['status' => 'applied', 'applied_at' => '2026-01-01 00:00:00'], ['id' => $id]);
            }
            return $query;
        });

        $this->assertSame(['notified' => false], coquille_revue_set_status($id, 'applied'));
        $this->assertTrue($raced);
        $this->assertCount(0, $this->sent_mails());
        $this->assertSame('2026-01-01 00:00:00', $this->get_annotation($id)['applied_at']);
    }

    public function test_one_email_per_address_per_day() {
        $first  = $this->insert_annotation(['reviewer_email' => 'marie@example.org']);
        $second = $this->insert_annotation(['reviewer_email' => 'MARIE@example.org']);
        coquille_revue_set_status($first, 'applied');
        $this->assertSame(['notified' => false], coquille_revue_set_status($second, 'applied'));
        $this->assertCount(1, $this->sent_mails());
    }

    public function test_daily_cap_per_site() {
        for ($i = 0; $i <= COQUILLE_REVUE_THANKS_PER_SITE; $i++) {
            coquille_revue_set_status($this->insert_annotation(['reviewer_email' => "reviewer{$i}@example.org"]), 'applied');
        }
        $this->assertCount(COQUILLE_REVUE_THANKS_PER_SITE, $this->sent_mails());
    }

    public function test_setting_off_sends_nothing_and_stores_no_visitor_email() {
        update_option('coquille_revue_thank_contributors', 0);
        $id = $this->insert_annotation(['reviewer_email' => 'marie@example.org']);
        $this->assertFalse(coquille_revue_will_notify($this->get_annotation($id)));
        $this->assertSame(['notified' => false], coquille_revue_set_status($id, 'applied'));
        $this->assertCount(0, $this->sent_mails());

        $this->set_public_mode();
        $this->assertSame(201, $this->post_annotation(['reviewerEmail' => 'paul@example.org'])->get_status());
        $this->assertNull($this->last_annotation()['reviewer_email']);
    }

    public function test_setting_off_stores_no_account_email_either() {
        update_option('coquille_revue_thank_contributors', 0);
        wp_set_current_user(self::factory()->user->create(['role' => 'editor']));
        $response = $this->post_annotation();
        $this->assertSame(201, $response->get_status());
        $this->assertNull($this->get_annotation($response->get_data()['id'])['reviewer_email']);
    }

    public function test_filter_decides_annotation_by_annotation() {
        $seen = null;
        add_filter('coquille_revue_notify_contributor', function ($enabled, $row) use (&$seen) {
            $seen = [$enabled, $row['reviewer_email']];
            return false;
        }, 10, 2);
        $id = $this->insert_annotation(['reviewer_email' => 'marie@example.org']);
        coquille_revue_set_status($id, 'applied');

        $this->assertSame([true, 'marie@example.org'], $seen);
        $this->assertCount(0, $this->sent_mails());
    }

    public function test_no_email_without_a_valid_address() {
        coquille_revue_set_status($this->insert_annotation(), 'applied');
        coquille_revue_set_status($this->insert_annotation(['reviewer_email' => 'not-an-email']), 'applied');
        $this->assertCount(0, $this->sent_mails());
    }

    public function test_api_reports_the_email() {
        $id = $this->insert_annotation(['reviewer_email' => 'marie@example.org']);
        wp_set_current_user(self::factory()->user->create(['role' => 'editor']));
        $response = $this->rest('PATCH', "/annotation/{$id}/status", ['status' => 'applied']);
        $this->assertTrue($response->get_data()['notified']);
    }
}
