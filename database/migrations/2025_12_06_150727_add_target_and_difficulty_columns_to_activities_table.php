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
        Schema::table('activities', function (Blueprint $table) {
            // Mục tiêu định tính - Qualitative target
            $table->text('qualitative_target')->nullable()->after('description')
                ->comment('Mục tiêu định tính của hoạt động');

            // Mục tiêu định lượng - Quantitative target
            $table->text('quantitative_target')->nullable()->after('qualitative_target')
                ->comment('Mục tiêu định lượng của hoạt động');

            // Khó khăn vướng mắc - Difficulties/Obstacles
            $table->text('difficulties')->nullable()->after('result_summary')
                ->comment('Khó khăn, vướng mắc trong quá trình thực hiện');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropColumn(['qualitative_target', 'quantitative_target', 'difficulties']);
        });
    }
};
