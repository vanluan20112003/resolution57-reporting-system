<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('kpi_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->integer('display_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Seed initial categories
        $categories = [
            ['code' => 'GOVERNANCE', 'name' => 'Quản trị đại học', 'display_order' => 1],
            ['code' => 'TRAINING', 'name' => 'Đào tạo', 'display_order' => 2],
            ['code' => 'SCIENCE_TECH', 'name' => 'Khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số', 'display_order' => 3],
            ['code' => 'INFRASTRUCTURE', 'name' => 'Đầu tư phát triển cơ sở vật chất, hạ tầng', 'display_order' => 4],
            ['code' => 'INTERNATIONAL', 'name' => 'Hợp tác quốc tế và tham gia xếp hạng đại học của ĐHQG-HCM', 'display_order' => 5],
            ['code' => 'FINANCE', 'name' => 'Tài chính', 'display_order' => 6],
        ];

        foreach ($categories as $category) {
            DB::table('kpi_categories')->insert([
                'id' => \Illuminate\Support\Str::uuid(),
                'code' => $category['code'],
                'name' => $category['name'],
                'display_order' => $category['display_order'],
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Add category_id to kpis table
        Schema::table('kpis', function (Blueprint $table) {
            $table->uuid('category_id')->nullable()->after('category');
            $table->foreign('category_id')->references('id')->on('kpi_categories')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kpis', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn('category_id');
        });

        Schema::dropIfExists('kpi_categories');
    }
};
