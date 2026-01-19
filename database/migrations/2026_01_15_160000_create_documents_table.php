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
        Schema::create('documents', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Basic document info
            $table->string('title', 500);
            $table->text('description')->nullable();

            // File info
            $table->string('file_path', 1000)->comment('Đường dẫn file trong storage');
            $table->string('file_name', 500)->comment('Tên file gốc');
            $table->string('file_type', 100)->nullable()->comment('MIME type');
            $table->unsignedBigInteger('file_size')->default(0)->comment('Kích thước file (bytes)');

            // Metadata for filtering
            $table->string('category', 255)->nullable()->comment('Danh mục tài liệu');
            $table->json('tags')->nullable()->comment('Tags để filter');
            $table->char('organization_id', 36)->nullable()->comment('Tổ chức sở hữu (null = toàn hệ thống)');

            // Access control
            $table->enum('visibility', ['PUBLIC', 'ORGANIZATION', 'PRIVATE'])->default('PUBLIC')
                ->comment('PUBLIC: Tất cả user, ORGANIZATION: Chỉ trong tổ chức, PRIVATE: Chỉ người tạo');

            // Author info
            $table->char('uploaded_by', 36)->comment('ID người upload');

            // Status
            $table->boolean('is_active')->default(true);

            // Timestamps
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('category');
            $table->index('visibility');
            $table->index('organization_id');
            $table->index('uploaded_by');
            $table->index('is_active');
            $table->index('created_at');

            // Foreign keys
            $table->foreign('organization_id')->references('id')->on('organizations')->onDelete('set null');
            $table->foreign('uploaded_by')->references('id')->on('nq57_users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
