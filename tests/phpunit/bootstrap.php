<?php
// PHPUnit bootstrap: WordPress test suite installed by bin/install-wp-tests.sh (CI) or bin/test-local.sh (Windows),
// plugin loaded as a must-use plugin. WP_MULTISITE=1 runs the same tests on a multisite network.

$coquille_revue_tests_dir = getenv('WP_TESTS_DIR') ?: rtrim(sys_get_temp_dir(), '/\\') . '/wordpress-tests-lib';

require_once dirname(__DIR__, 2) . '/vendor/yoast/phpunit-polyfills/phpunitpolyfills-autoload.php';

if (!file_exists($coquille_revue_tests_dir . '/includes/functions.php')) {
    fwrite(STDERR, "WordPress test suite not found in {$coquille_revue_tests_dir}: run bin/install-wp-tests.sh or bin/test-local.sh.\n");
    exit(1);
}

require_once $coquille_revue_tests_dir . '/includes/functions.php';

tests_add_filter('muplugins_loaded', function () {
    require dirname(__DIR__, 2) . '/coquille-revue.php';
});

require $coquille_revue_tests_dir . '/includes/bootstrap.php';
require __DIR__ . '/class-coquille-revue-test-case.php';

// The installer of the test suite only drops the core tables: start from an empty annotations table.
global $wpdb;
$wpdb->query($wpdb->prepare('TRUNCATE TABLE %i', coquille_revue_table()));
