<?php
// CSV export: no cell can run as a spreadsheet formula, and a visitor cannot close a cell and open another one.
class Test_Coquille_Revue_Csv extends Coquille_Revue_Test_Case {

    public function test_cells_that_would_run_as_formulas_start_with_an_apostrophe() {
        foreach (['=1+1', '+33 1 23', '-2+3', '@SUM(A1)', "\t=1", "\r=1", "\n=1"] as $value) {
            $this->assertSame("'" . $value, coquille_revue_csv_cell($value), wp_json_encode($value));
        }
        foreach (['Bienvenue', 'a=b', '', '12', 'Prix : 5 €'] as $value) {
            $this->assertSame($value, coquille_revue_csv_cell($value));
        }
        $this->assertSame('42', coquille_revue_csv_cell(42));
        $this->assertSame('', coquille_revue_csv_cell(null));
    }

    public function test_quotes_are_doubled_without_escape_character() {
        $out = fopen('php://memory', 'w+');
        coquille_revue_csv_line($out, ['a\\"b', '=HYPERLINK("https://evil.example")', 'x;y', "two\nlines"]);
        rewind($out);
        $csv = stream_get_contents($out);

        $this->assertSame("\"a\\\"\"b\";\"'=HYPERLINK(\"\"https://evil.example\"\")\";\"x;y\";\"two\nlines\"\n", $csv);
        $this->assertSame(['a\\"b', "'=HYPERLINK(\"https://evil.example\")", 'x;y', "two\nlines"], str_getcsv(rtrim($csv, "\n"), ';', '"', ''));
    }
}
