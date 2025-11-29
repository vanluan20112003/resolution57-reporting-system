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
        Schema::create('organizations', function (Blueprint $table) {
            $table->char('id', 36)->primary()->comment('UUID');
            $table->string('code', 50)->unique()->comment('Mã đơn vị: HCMUT, UIT...');
            $table->string('name', 255)->comment('Tên đầy đủ');
            $table->string('short_name', 100)->nullable()->comment('Tên viết tắt');
            $table->string('type', 50)->comment('UNIVERSITY, INSTITUTE, CENTER, OFFICE, EXTERNAL, OTHER');
            $table->char('parent_id', 36)->nullable()->comment('Đơn vị cha');
            $table->boolean('is_vnuhcm')->default(true)->comment('Thuộc ĐHQG');
            $table->string('contact_email', 255)->nullable();
            $table->string('contact_phone', 20)->nullable();
            $table->text('address')->nullable();
            $table->string('website', 500)->nullable();
            $table->text('description')->nullable();
            $table->string('status', 20)->default('active')->comment('active, inactive');
            $table->integer('display_order')->default(0)->comment('Thứ tự hiển thị');
            $table->char('created_by', 36)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            // Indexes
            $table->index('code', 'idx_code');
            $table->index('parent_id', 'idx_parent_id');
            $table->index('type', 'idx_type');
            $table->index(['is_vnuhcm', 'status'], 'idx_vnuhcm_status');

            // Foreign keys
            $table->foreign('parent_id')->references('id')->on('organizations')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
