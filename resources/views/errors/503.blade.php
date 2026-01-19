<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $settings['title'] ?? 'Hệ thống đang bảo trì' }} - NQ57 Portal</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }

        .maintenance-container {
            background: white;
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            max-width: 560px;
            width: 100%;
            padding: 48px;
            text-align: center;
            animation: slideUp 0.6s ease-out;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .logo {
            margin-bottom: 32px;
        }

        .logo img {
            height: 60px;
            width: auto;
        }

        .icon-wrapper {
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 32px;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% {
                box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4);
            }
            70% {
                box-shadow: 0 0 0 20px rgba(102, 126, 234, 0);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(102, 126, 234, 0);
            }
        }

        .icon-wrapper svg {
            width: 48px;
            height: 48px;
            color: white;
        }

        .notification-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 24px;
        }

        .notification-badge.info {
            background: #e0f2fe;
            color: #0369a1;
        }

        .notification-badge.warning {
            background: #fef3c7;
            color: #d97706;
        }

        .notification-badge.error {
            background: #fee2e2;
            color: #dc2626;
        }

        h1 {
            font-size: 28px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 16px;
            line-height: 1.3;
        }

        .message {
            font-size: 16px;
            color: #64748b;
            line-height: 1.7;
            margin-bottom: 32px;
        }

        .countdown-section {
            background: #f8fafc;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 32px;
        }

        .countdown-label {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .countdown {
            display: flex;
            justify-content: center;
            gap: 16px;
        }

        .countdown-item {
            text-align: center;
        }

        .countdown-value {
            font-size: 36px;
            font-weight: 700;
            color: #667eea;
            line-height: 1;
        }

        .countdown-unit {
            font-size: 12px;
            color: #94a3b8;
            margin-top: 4px;
            text-transform: uppercase;
        }

        .countdown-separator {
            font-size: 36px;
            font-weight: 700;
            color: #cbd5e1;
            line-height: 1;
        }

        .progress-bar {
            width: 100%;
            height: 6px;
            background: #e2e8f0;
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 32px;
        }

        .progress-bar-inner {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            border-radius: 3px;
            animation: progress 2s ease-in-out infinite;
        }

        @keyframes progress {
            0% {
                width: 0%;
            }
            50% {
                width: 70%;
            }
            100% {
                width: 100%;
            }
        }

        .contact-info {
            font-size: 14px;
            color: #94a3b8;
        }

        .contact-info a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }

        .contact-info a:hover {
            text-decoration: underline;
        }

        .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            font-size: 13px;
            color: #94a3b8;
        }

        @media (max-width: 480px) {
            .maintenance-container {
                padding: 32px 24px;
            }

            h1 {
                font-size: 24px;
            }

            .countdown-value {
                font-size: 28px;
            }

            .countdown-separator {
                font-size: 28px;
            }
        }
    </style>
</head>
<body>
    <div class="maintenance-container">
        <!-- Logo -->
        <div class="logo">
            <img src="/VNUHCM_logo.png" alt="VNUHCM Logo" onerror="this.style.display='none'">
        </div>

        <!-- Icon -->
        <div class="icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </div>

        <!-- Notification Badge -->
        @php
            $notificationType = $settings['notification_type'] ?? 'info';
            $badgeLabels = [
                'info' => 'Thông tin',
                'warning' => 'Cảnh báo',
                'error' => 'Quan trọng'
            ];
        @endphp
        <div class="notification-badge {{ $notificationType }}">
            @if($notificationType === 'info')
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                </svg>
            @elseif($notificationType === 'warning')
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
            @else
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                </svg>
            @endif
            {{ $badgeLabels[$notificationType] ?? 'Thông tin' }}
        </div>

        <!-- Title -->
        <h1>{{ $settings['title'] ?? 'Hệ thống đang bảo trì' }}</h1>

        <!-- Message -->
        <p class="message">
            {{ $settings['message'] ?? 'Chúng tôi đang nâng cấp hệ thống để phục vụ bạn tốt hơn. Vui lòng quay lại sau.' }}
        </p>

        <!-- Countdown -->
        @if(($settings['show_countdown'] ?? false) && !empty($settings['estimated_end_time']))
            <div class="countdown-section">
                <div class="countdown-label">Dự kiến hoàn thành trong</div>
                <div class="countdown" id="countdown" data-end="{{ $settings['estimated_end_time'] }}">
                    <div class="countdown-item">
                        <div class="countdown-value" id="hours">00</div>
                        <div class="countdown-unit">Giờ</div>
                    </div>
                    <div class="countdown-separator">:</div>
                    <div class="countdown-item">
                        <div class="countdown-value" id="minutes">00</div>
                        <div class="countdown-unit">Phút</div>
                    </div>
                    <div class="countdown-separator">:</div>
                    <div class="countdown-item">
                        <div class="countdown-value" id="seconds">00</div>
                        <div class="countdown-unit">Giây</div>
                    </div>
                </div>
            </div>
        @endif

        <!-- Progress Bar -->
        <div class="progress-bar">
            <div class="progress-bar-inner"></div>
        </div>

        <!-- Contact Info -->
        <p class="contact-info">
            Nếu bạn cần hỗ trợ gấp, vui lòng liên hệ<br>
            <a href="mailto:support@vnuhcm.edu.vn">support@vnuhcm.edu.vn</a>
        </p>

        <!-- Footer -->
        <div class="footer">
            NQ57 Portal - ĐHQG-HCM &copy; {{ date('Y') }}
        </div>
    </div>

    @if(($settings['show_countdown'] ?? false) && !empty($settings['estimated_end_time']))
    <script>
        function updateCountdown() {
            const countdownEl = document.getElementById('countdown');
            if (!countdownEl) return;

            const endTime = new Date(countdownEl.dataset.end).getTime();
            const now = new Date().getTime();
            const distance = endTime - now;

            if (distance < 0) {
                document.getElementById('hours').textContent = '00';
                document.getElementById('minutes').textContent = '00';
                document.getElementById('seconds').textContent = '00';
                // Auto refresh page when countdown ends
                setTimeout(() => location.reload(), 5000);
                return;
            }

            const hours = Math.floor(distance / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
            document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
            document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
        }

        updateCountdown();
        setInterval(updateCountdown, 1000);

        // Auto refresh every 30 seconds to check if maintenance ended
        setTimeout(() => location.reload(), 30000);
    </script>
    @endif
</body>
</html>
