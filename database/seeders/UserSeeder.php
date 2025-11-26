<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('nq57_users')->insert([
            [
                'id' => (string) Str::uuid(),
                'first_name' => 'Nguyễn Hữu',
                'last_name' => 'Việt Long',
                'email' => 'long.nguyen@vnu-itp.edu.vn',
                'password_hash' => Hash::make('123456'), // Mật khẩu: 123456
                'role' => 'ADMIN',
                'status' => 'active',
                'is_vnuhcm' => true,
                'avatar' => null,
                'avatar_url' => null,
                'google_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => (string) Str::uuid(),
                'first_name' => 'Test',
                'last_name' => 'User',
                'email' => 'test@vnuhcm.edu.vn',
                'password_hash' => Hash::make('password'), // Mật khẩu: password
                'role' => 'USER',
                'status' => 'active',
                'is_vnuhcm' => true,
                'avatar' => null,
                'avatar_url' => null,
                'google_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
