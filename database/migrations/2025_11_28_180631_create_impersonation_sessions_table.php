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
        Schema::create('impersonation_sessions', function (Blueprint $table) {
            $table->id();
            $table->char('admin_id', 36); // UUID of the original admin
            $table->char('impersonated_user_id', 36); // UUID of the user being impersonated
            $table->bigInteger('token_id')->unsigned(); // Reference to personal_access_tokens.id
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('admin_id');
            $table->index('impersonated_user_id');
            $table->index('token_id');

            // Foreign keys
            $table->foreign('admin_id')->references('id')->on('nq57_users')->onDelete('cascade');
            $table->foreign('impersonated_user_id')->references('id')->on('nq57_users')->onDelete('cascade');
            $table->foreign('token_id')->references('id')->on('personal_access_tokens')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('impersonation_sessions');
    }
};
