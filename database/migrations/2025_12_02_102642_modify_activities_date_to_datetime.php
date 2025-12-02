<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Đổi start_date, end_date, actual_start_date, actual_end_date từ date sang datetime
     * để có thể lưu cả thời điểm (giờ:phút:giây)
     */
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dateTime('start_date')->nullable()->change();
            $table->dateTime('end_date')->nullable()->change();
            $table->dateTime('actual_start_date')->nullable()->change();
            $table->dateTime('actual_end_date')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->date('start_date')->nullable()->change();
            $table->date('end_date')->nullable()->change();
            $table->date('actual_start_date')->nullable()->change();
            $table->date('actual_end_date')->nullable()->change();
        });
    }
};
