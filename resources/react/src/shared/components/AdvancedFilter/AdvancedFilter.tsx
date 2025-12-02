/**
 * Advanced Filter Component
 * Reusable filter component with collapsible panel, multiple filter types,
 * preset saving, and clear all functionality
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Tag,
  Collapse,
  Badge,
  Tooltip,
  Dropdown,
  message,
  InputNumber,
} from 'antd'
import {
  SearchOutlined,
  FilterOutlined,
  ClearOutlined,
  SaveOutlined,
  DownOutlined,
  StarOutlined,
  StarFilled,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import './AdvancedFilter.css'

const { RangePicker } = DatePicker
const { Option } = Select

// Filter field types
export type FilterFieldType =
  | 'text'
  | 'select'
  | 'multiselect'
  | 'daterange'
  | 'date'
  | 'number'
  | 'numberrange'
  | 'boolean'

// Filter field option
export interface FilterOption {
  value: string | number | boolean
  label: string
  color?: string
}

// Filter field definition
export interface FilterField {
  key: string
  label: string
  type: FilterFieldType
  placeholder?: string
  options?: FilterOption[]
  span?: number // Grid span (1-24), default 6
  allowClear?: boolean
  showSearch?: boolean
  min?: number
  max?: number
  step?: number
  defaultValue?: any
}

// Filter values type
export interface FilterValues {
  [key: string]: any
}

// Saved preset
interface FilterPreset {
  id: string
  name: string
  values: FilterValues
  isDefault?: boolean
}

// Props
interface AdvancedFilterProps {
  fields: FilterField[]
  values: FilterValues
  onChange: (values: FilterValues) => void
  onSearch?: () => void
  onReset?: () => void
  loading?: boolean
  storageKey?: string // For localStorage persistence
  showPresets?: boolean
  collapsible?: boolean
  defaultExpanded?: boolean
  extra?: React.ReactNode // Extra buttons/content
}

function AdvancedFilter({
  fields,
  values,
  onChange,
  onSearch,
  onReset,
  loading = false,
  storageKey,
  showPresets = false,
  collapsible = true,
  defaultExpanded = false,
  extra,
}: AdvancedFilterProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [presets, setPresets] = useState<FilterPreset[]>([])
  const [presetName, setPresetName] = useState('')

  // Count active filters
  const activeFilterCount = Object.values(values).filter(
    (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
  ).length

  // Load presets from localStorage
  useEffect(() => {
    if (storageKey && showPresets) {
      const saved = localStorage.getItem(`${storageKey}_presets`)
      if (saved) {
        try {
          setPresets(JSON.parse(saved))
        } catch (e) {
          console.error('Failed to load filter presets:', e)
        }
      }
    }
  }, [storageKey, showPresets])

  // Save presets to localStorage
  const savePresets = useCallback(
    (newPresets: FilterPreset[]) => {
      if (storageKey) {
        localStorage.setItem(`${storageKey}_presets`, JSON.stringify(newPresets))
      }
      setPresets(newPresets)
    },
    [storageKey]
  )

  // Handle field value change
  const handleFieldChange = (key: string, value: any) => {
    onChange({ ...values, [key]: value })
  }

  // Handle clear all
  const handleClearAll = () => {
    const clearedValues: FilterValues = {}
    fields.forEach((field) => {
      clearedValues[field.key] = field.defaultValue ?? undefined
    })
    onChange(clearedValues)
    onReset?.()
  }

  // Handle save preset
  const handleSavePreset = () => {
    if (!presetName.trim()) {
      message.warning('Vui lòng nhập tên cho bộ lọc')
      return
    }

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      values: { ...values },
    }

    savePresets([...presets, newPreset])
    setPresetName('')
    message.success('Đã lưu bộ lọc')
  }

  // Handle load preset
  const handleLoadPreset = (preset: FilterPreset) => {
    onChange(preset.values)
    message.success(`Đã áp dụng bộ lọc "${preset.name}"`)
  }

  // Handle delete preset
  const handleDeletePreset = (presetId: string) => {
    savePresets(presets.filter((p) => p.id !== presetId))
    message.success('Đã xóa bộ lọc')
  }

  // Handle set default preset
  const handleSetDefaultPreset = (presetId: string) => {
    savePresets(
      presets.map((p) => ({
        ...p,
        isDefault: p.id === presetId,
      }))
    )
    message.success('Đã đặt làm bộ lọc mặc định')
  }

  // Render a single filter field
  const renderField = (field: FilterField) => {
    const value = values[field.key]
    const span = field.span || 6

    switch (field.type) {
      case 'text':
        return (
          <Col span={span} key={field.key}>
            <div className="filter-field">
              <label className="filter-label">{field.label}</label>
              <Input
                placeholder={field.placeholder || `Nhập ${field.label.toLowerCase()}...`}
                value={value}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                allowClear={field.allowClear !== false}
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                onPressEnter={onSearch}
              />
            </div>
          </Col>
        )

      case 'select':
        return (
          <Col span={span} key={field.key}>
            <div className="filter-field">
              <label className="filter-label">{field.label}</label>
              <Select
                placeholder={field.placeholder || `Chọn ${field.label.toLowerCase()}`}
                value={value}
                onChange={(v) => handleFieldChange(field.key, v)}
                allowClear={field.allowClear !== false}
                showSearch={field.showSearch !== false}
                optionFilterProp="children"
                style={{ width: '100%' }}
              >
                {field.options?.map((opt) => (
                  <Option key={String(opt.value)} value={opt.value}>
                    {opt.color ? (
                      <Tag color={opt.color} style={{ marginRight: 0 }}>
                        {opt.label}
                      </Tag>
                    ) : (
                      opt.label
                    )}
                  </Option>
                ))}
              </Select>
            </div>
          </Col>
        )

      case 'multiselect':
        return (
          <Col span={span} key={field.key}>
            <div className="filter-field">
              <label className="filter-label">{field.label}</label>
              <Select
                mode="multiple"
                placeholder={field.placeholder || `Chọn ${field.label.toLowerCase()}`}
                value={value || []}
                onChange={(v) => handleFieldChange(field.key, v)}
                allowClear={field.allowClear !== false}
                showSearch={field.showSearch !== false}
                optionFilterProp="children"
                style={{ width: '100%' }}
                maxTagCount="responsive"
              >
                {field.options?.map((opt) => (
                  <Option key={String(opt.value)} value={opt.value}>
                    {opt.color ? (
                      <Tag color={opt.color} style={{ marginRight: 0 }}>
                        {opt.label}
                      </Tag>
                    ) : (
                      opt.label
                    )}
                  </Option>
                ))}
              </Select>
            </div>
          </Col>
        )

      case 'daterange':
        return (
          <Col span={span} key={field.key}>
            <div className="filter-field">
              <label className="filter-label">{field.label}</label>
              <RangePicker
                value={value}
                onChange={(dates) => handleFieldChange(field.key, dates)}
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
                placeholder={['Từ ngày', 'Đến ngày']}
                allowClear={field.allowClear !== false}
              />
            </div>
          </Col>
        )

      case 'date':
        return (
          <Col span={span} key={field.key}>
            <div className="filter-field">
              <label className="filter-label">{field.label}</label>
              <DatePicker
                value={value}
                onChange={(date) => handleFieldChange(field.key, date)}
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
                placeholder={field.placeholder || 'Chọn ngày'}
                allowClear={field.allowClear !== false}
              />
            </div>
          </Col>
        )

      case 'number':
        return (
          <Col span={span} key={field.key}>
            <div className="filter-field">
              <label className="filter-label">{field.label}</label>
              <InputNumber
                value={value}
                onChange={(v) => handleFieldChange(field.key, v)}
                min={field.min}
                max={field.max}
                step={field.step}
                style={{ width: '100%' }}
                placeholder={field.placeholder}
              />
            </div>
          </Col>
        )

      case 'numberrange':
        return (
          <Col span={span} key={field.key}>
            <div className="filter-field">
              <label className="filter-label">{field.label}</label>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  value={value?.[0]}
                  onChange={(v) => handleFieldChange(field.key, [v, value?.[1]])}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  style={{ width: '50%' }}
                  placeholder="Từ"
                />
                <InputNumber
                  value={value?.[1]}
                  onChange={(v) => handleFieldChange(field.key, [value?.[0], v])}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  style={{ width: '50%' }}
                  placeholder="Đến"
                />
              </Space.Compact>
            </div>
          </Col>
        )

      case 'boolean':
        return (
          <Col span={span} key={field.key}>
            <div className="filter-field">
              <label className="filter-label">{field.label}</label>
              <Select
                placeholder={field.placeholder || `Chọn ${field.label.toLowerCase()}`}
                value={value}
                onChange={(v) => handleFieldChange(field.key, v)}
                allowClear={field.allowClear !== false}
                style={{ width: '100%' }}
              >
                <Option value={true}>Có</Option>
                <Option value={false}>Không</Option>
              </Select>
            </div>
          </Col>
        )

      default:
        return null
    }
  }

  // Preset dropdown menu items
  const presetMenuItems: MenuProps['items'] = [
    ...(presets.length > 0
      ? presets.map((preset) => ({
          key: preset.id,
          label: (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span onClick={() => handleLoadPreset(preset)} style={{ flex: 1 }}>
                {preset.isDefault && <StarFilled style={{ color: '#faad14', marginRight: 4 }} />}
                {preset.name}
              </span>
              <Space size={4}>
                <Tooltip title="Đặt làm mặc định">
                  <Button
                    type="text"
                    size="small"
                    icon={preset.isDefault ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSetDefaultPreset(preset.id)
                    }}
                  />
                </Tooltip>
                <Tooltip title="Xóa">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePreset(preset.id)
                    }}
                  />
                </Tooltip>
              </Space>
            </div>
          ),
        }))
      : [{ key: 'empty', label: 'Chưa có bộ lọc đã lưu', disabled: true }]),
    { type: 'divider' },
    {
      key: 'save',
      label: (
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Tên bộ lọc..."
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onPressEnter={handleSavePreset}
            onClick={(e) => e.stopPropagation()}
            style={{ width: 150 }}
          />
          <Button icon={<SaveOutlined />} onClick={handleSavePreset}>
            Lưu
          </Button>
        </Space.Compact>
      ),
    },
  ]

  // Filter content
  const filterContent = (
    <div className="advanced-filter-content">
      {/* Filter Fields */}
      <Row gutter={[16, 8]} align="middle">
        {fields.map((field) => renderField(field))}
      </Row>

      {/* Action buttons - separate row */}
      <div className="filter-actions-row">
        <Space wrap>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={onSearch}
            loading={loading}
          >
            Tìm kiếm
          </Button>
          <Button icon={<ClearOutlined />} onClick={handleClearAll}>
            Xóa bộ lọc
          </Button>
          {showPresets && (
            <Dropdown menu={{ items: presetMenuItems }} trigger={['click']}>
              <Button icon={<SaveOutlined />}>
                Lưu/Tải <DownOutlined />
              </Button>
            </Dropdown>
          )}
        </Space>
        {extra && <div className="filter-extra">{extra}</div>}
      </div>
    </div>
  )

  // Render based on collapsible setting
  if (!collapsible) {
    return (
      <Card className="advanced-filter-card" size="small">
        {filterContent}
      </Card>
    )
  }

  return (
    <Card className="advanced-filter-card" size="small">
      <Collapse
        ghost
        activeKey={expanded ? ['filter'] : []}
        onChange={(keys) => setExpanded(keys.includes('filter'))}
        items={[
          {
            key: 'filter',
            label: (
              <Space>
                <FilterOutlined />
                <span>Bộ lọc nâng cao</span>
                {activeFilterCount > 0 && (
                  <Badge count={activeFilterCount} style={{ backgroundColor: '#1890ff' }} />
                )}
              </Space>
            ),
            children: filterContent,
          },
        ]}
      />
    </Card>
  )
}

export default AdvancedFilter
