import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Result } from 'antd'
import { CloseCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

function UnauthorizedPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const reason = searchParams.get('reason')

  // Don't clear localStorage here - it causes redirect loop
  // Unauthorized users never successfully logged in, so there's no token to clear

  const getErrorMessage = () => {
    switch (reason) {
      case 'email_not_authorized':
        return t('unauthorized.emailNotAuthorized')
      default:
        return t('unauthorized.defaultMessage')
    }
  }

  const getErrorDescription = () => {
    switch (reason) {
      case 'email_not_authorized':
        return t('unauthorized.emailNotAuthorizedDescription')
      default:
        return t('unauthorized.defaultDescription')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '48px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <Result
          status="403"
          icon={<CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '72px' }} />}
          title={
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#262626', marginTop: '24px' }}>
              {getErrorMessage()}
            </div>
          }
          subTitle={
            <div style={{ fontSize: '16px', color: '#595959', marginTop: '16px', lineHeight: '1.6' }}>
              {getErrorDescription()}
            </div>
          }
          extra={[
            <Button
              type="primary"
              size="large"
              key="login"
              onClick={() => navigate('/login')}
              style={{
                height: '48px',
                fontSize: '16px',
                borderRadius: '8px',
                minWidth: '160px'
              }}
            >
              {t('unauthorized.backToLogin')}
            </Button>,
            <Button
              size="large"
              key="contact"
              href="mailto:support@vnuhcm.edu.vn"
              style={{
                height: '48px',
                fontSize: '16px',
                borderRadius: '8px',
                minWidth: '160px',
                marginLeft: '12px'
              }}
            >
              {t('unauthorized.contactSupport')}
            </Button>
          ]}
        />

        <div style={{
          marginTop: '32px',
          padding: '20px',
          background: '#f5f5f5',
          borderRadius: '8px',
          borderLeft: '4px solid #1890ff'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#262626', fontSize: '16px' }}>
            {t('unauthorized.howToGetAccess')}
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#595959', lineHeight: '1.8' }}>
            <li>{t('unauthorized.step1')}</li>
            <li>{t('unauthorized.step2')}</li>
            <li>{t('unauthorized.step3')}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default UnauthorizedPage
