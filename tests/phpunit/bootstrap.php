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

// WP-CLI stand-in: the Coquille_Revue_CLI class is only declared when WP_CLI is defined (WordPress itself never reads
// this constant). error() throws, so that a refusal can be checked; line() and success() keep the output.
if (!defined('WP_CLI')) {
    define('WP_CLI', true);

    class Coquille_Revue_Test_CLI_Error extends Exception {}

    class WP_CLI {
        public static $output = [];

        public static function error($message) {
            throw new Coquille_Revue_Test_CLI_Error((string) $message); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- test stand-in, never printed.
        }

        public static function line($message = '') {
            self::$output[] = (string) $message;
        }

        public static function success($message) {
            self::$output[] = 'Success: ' . $message;
        }

        public static function add_command($name, $callable) {}
    }
}

tests_add_filter('muplugins_loaded', function () {
    require dirname(__DIR__, 2) . '/coquille-revue.php';
});

require $coquille_revue_tests_dir . '/includes/bootstrap.php';
require __DIR__ . '/class-coquille-revue-test-case.php';

// The installer of the test suite only drops the core tables: start from an empty annotations table.
global $wpdb;
$wpdb->query($wpdb->prepare('TRUNCATE TABLE %i', coquille_revue_table()));
