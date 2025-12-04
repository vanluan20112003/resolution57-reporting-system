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
        Schema::create('activity_files', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('activity_id');
            $table->uuid('file_type_id')->nullable();
            $table->string('file_name', 255);
            $table->string('file_path', 500)->nullable(); // For uploaded files
            $table->string('file_url', 1000)->nullable(); // For external links
            $table->enum('source_type', ['upload', 'link'])->default('upload');
            $table->unsignedBigInteger('file_size')->nullable();
            $table->string('file_extension', 20)->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->text('description')->nullable();
            $table->uuid('uploaded_by')->nullable();
            $table->boolean('is_public')->default(true);
            $table->timestamp('uploaded_at')->useCurrent();

            $table->foreign('activity_id')->references('id')->on('activities')->onDelete('cascade');
            $table->foreign('file_type_id')->references('id')->on('file_types')->onDelete('set null');
            $table->foreign('uploaded_by')->references('id')->on('users')->onDelete('set null');

            $table->index('activity_id');
            $table->index('file_type_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_files');
    }
};
