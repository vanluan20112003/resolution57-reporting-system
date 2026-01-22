<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Bảng lưu trữ các file đính kèm cho đợt báo cáo:
     * - File từ đơn vị tạo đợt báo cáo (chỉ 1 file)
     * - File minh chứng từ các đơn vị phối hợp (có thể nhiều file)
     */
    public function up(): void
    {
        Schema::create('report_batch_files', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('report_batch_id');
            $table->uuid('organization_id'); // Đơn vị upload file
            $table->uuid('uploaded_by'); // Người upload

            // File info
            $table->string('file_name'); // Tên file gốc
            $table->string('file_path'); // Đường dẫn lưu trữ
            $table->string('file_type')->nullable(); // MIME type
            $table->unsignedBigInteger('file_size')->default(0); // Kích thước file (bytes)

            // Metadata
            $table->string('title')->nullable(); // Tiêu đề/mô tả file
            $table->text('description')->nullable(); // Mô tả chi tiết

            // Loại file: 'owner' = file từ đơn vị tạo, 'collaborator' = file từ đơn vị phối hợp
            $table->enum('file_source', ['owner', 'collaborator'])->default('collaborator');

            $table->timestamps();

            // Foreign keys
            $table->foreign('report_batch_id')
                ->references('id')
                ->on('report_batches')
                ->onDelete('cascade');

            $table->foreign('organization_id')
                ->references('id')
                ->on('organizations')
                ->onDelete('cascade');

            $table->foreign('uploaded_by')
                ->references('id')
                ->on('nq57_users')
                ->onDelete('cascade');

            // Indexes
            $table->index(['report_batch_id', 'organization_id']);
            $table->index(['report_batch_id', 'file_source']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_batch_files');
    }
};
