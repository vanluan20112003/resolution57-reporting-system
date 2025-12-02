<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add avatar/logo column to organizations table
     */
    public function up(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            // Avatar/Logo của tổ chức - lưu path tương đối trong storage
            $table->string('avatar', 500)->nullable()->after('website')->comment('Logo/Avatar của tổ chức');

            // Thêm cột cho banner/cover image nếu cần
            $table->string('cover_image', 500)->nullable()->after('avatar')->comment('Ảnh bìa của tổ chức');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn(['avatar', 'cover_image']);
        });
    }
};
