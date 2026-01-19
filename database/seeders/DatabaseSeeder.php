<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Note: Only system structure data (KPIs) should be seeded here.
     * Test data seeders have been removed.
     */
    public function run(): void
    {
        $this->call([
            KpiSeeder::class,
        ]);
    }
}
