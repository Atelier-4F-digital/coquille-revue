#!/usr/bin/env bash
# PHPUnit tests on Windows (Git Bash) with the PHP and MySQL of Local, without Docker.
# Requires a Local site started (its MySQL listens on DB_PORT) and composer.phar (COMPOSER_PHAR).
#   bash bin/test-local.sh                      single site
#   WP_MULTISITE=1 bash bin/test-local.sh       multisite
#   bash bin/test-local.sh --filter Alerts      any PHPUnit option
# The tests use their own database, coquille_revue_tests, never the database of a site: the WordPress
# test suite drops and recreates the WordPress tables of its database at each run.
set -euo pipefail
cd "$(dirname "$0")/.."

LOCAL_SERVICES="${LOCAL_SERVICES:-$HOME/AppData/Roaming/Local/lightning-services}"
LOCAL_PHP_DIR="${LOCAL_PHP_DIR:-$LOCAL_SERVICES/php-8.3.17+1/bin/win64}"
LOCAL_MYSQL="${LOCAL_MYSQL:-$LOCAL_SERVICES/mysql-8.0.35+4/bin/win64/bin/mysql.exe}"
DB_PORT="${DB_PORT:-10022}"   # MySQL port of the Local site (%APPDATA%/Local/sites.json)
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-root}"
DB_NAME=coquille_revue_tests
WP_VERSION="${WP_VERSION:-7.1.3}"
BASE="${WP_TESTS_BASE:-$HOME/wp-tests}"
COMPOSER_PHAR="${COMPOSER_PHAR:-$HOME/bin/composer.phar}"

for f in "$LOCAL_PHP_DIR/php.exe" "$LOCAL_MYSQL"; do
  [ -f "$f" ] || { echo "Not found: $f (set LOCAL_PHP_DIR or LOCAL_MYSQL)." >&2; exit 1; }
done

mkdir -p "$BASE/php" "$BASE/tmp"
if [ ! -f "$BASE/php/php.ini" ]; then
  cat > "$BASE/php/php.ini" <<EOF
extension_dir="$(cygpath -m "$LOCAL_PHP_DIR/ext")"
extension=mysqli
extension=mbstring
extension=openssl
extension=curl
extension=zip
extension=fileinfo
extension=sodium
extension=intl
extension=gd
memory_limit=1024M
display_startup_errors=0
error_reporting=E_ALL
EOF
fi

# The WordPress installer runs "php" in a sub-process: it must be in the PATH and read the same php.ini (mysqli).
export PATH="$LOCAL_PHP_DIR:$PATH"
PHPRC="$(cygpath -w "$BASE/php")"
export PHPRC
# GNU tar refuses a C:/… archive path, so TMPDIR stays /c/…; PHP does not understand /c/…, so the WordPress paths are C:/….
export TMPDIR="$BASE/tmp"
WP_CORE_DIR="$(cygpath -m "$BASE/wordpress-$WP_VERSION")"
WP_TESTS_DIR="$(cygpath -m "$BASE/wordpress-tests-lib-$WP_VERSION")"
export WP_CORE_DIR WP_TESTS_DIR
export WP_INSTALL_TESTS_SKIP_UPDATE_CHECK=true

if [ ! -d vendor ]; then
  [ -f "$COMPOSER_PHAR" ] || { echo "vendor/ is missing and $COMPOSER_PHAR was not found (set COMPOSER_PHAR)." >&2; exit 1; }
  php "$COMPOSER_PHAR" install --no-interaction
fi

if ! MYSQL_PWD="$DB_PASS" "$LOCAL_MYSQL" -h 127.0.0.1 -P "$DB_PORT" -u "$DB_USER" \
  -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"; then
  echo "MySQL is not reachable on 127.0.0.1:$DB_PORT: start the site in Local, or set DB_PORT." >&2
  exit 1
fi

if [ ! -f "$WP_CORE_DIR/wp-settings.php" ] || [ ! -f "$WP_TESTS_DIR/wp-tests-config.php" ]; then
  bash bin/install-wp-tests.sh "$DB_NAME" "$DB_USER" "$DB_PASS" "127.0.0.1:$DB_PORT" "$WP_VERSION" true
fi

config="$WP_TESTS_DIR/wp-tests-config.php"
grep -q "define( 'DB_NAME', '$DB_NAME' );" "$config" || { echo "$config does not use the $DB_NAME database: refused." >&2; exit 1; }
# Local may give the site another port: keep the configuration in step.
sed -i "s|define( 'DB_HOST', '[^']*' );|define( 'DB_HOST', '127.0.0.1:$DB_PORT' );|" "$config"

php vendor/bin/phpunit "$@"
