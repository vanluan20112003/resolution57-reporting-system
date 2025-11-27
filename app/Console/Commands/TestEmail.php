<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestEmail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:email {email}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test email configuration by sending a test email';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');

        $this->info('Testing email configuration...');
        $this->info('MAIL_HOST: ' . config('mail.mailers.smtp.host'));
        $this->info('MAIL_PORT: ' . config('mail.mailers.smtp.port'));
        $this->info('MAIL_USERNAME: ' . config('mail.mailers.smtp.username'));
        $this->info('');

        try {
            Mail::raw('This is a test email from NQ57 Portal Docker Container', function ($message) use ($email) {
                $message->to($email)
                        ->subject('Test Email - NQ57 Portal');
            });

            $this->info('✅ Email sent successfully to: ' . $email);
            return 0;
        } catch (\Exception $e) {
            $this->error('❌ Error sending email:');
            $this->error($e->getMessage());
            return 1;
        }
    }
}
