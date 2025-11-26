import { useState, useEffect } from 'react'
import { Select } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

const { Option } = Select

interface LanguageSwitcherProps {
  className?: string
}

function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { i18n } = useTranslation()
  const [currentLang, setCurrentLang] = useState(i18n.language || 'vi')

  useEffect(() => {
    setCurrentLang(i18n.language)
  }, [i18n.language])

  const handleChange = (value: string) => {
    i18n.changeLanguage(value)
    setCurrentLang(value)
  }

  return (
    <Select
      value={currentLang}
      onChange={handleChange}
      className={className}
      style={{ width: 120 }}
      suffixIcon={<GlobalOutlined />}
    >
      <Option value="vi">
        <span>🇻🇳 Tiếng Việt</span>
      </Option>
      <Option value="en">
        <span>🇬🇧 English</span>
      </Option>
    </Select>
  )
}

export default LanguageSwitcher
