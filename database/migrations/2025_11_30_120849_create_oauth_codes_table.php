<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('oauth_codes', function (Blueprint $table) {
            $table->string('code', 128)->primary();
            $table->text('token');
            $table->json('user_data');
            $table->timestamp('expires_at');
            $table->timestamp('created_at');

            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('oauth_codes');
    }
};
