/**
 * Mobile Date Picker Component
 * iOS-style wheel picker for selecting dates on mobile devices
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Modal, Button } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import './MobileDatePicker.css'

interface MobileDatePickerProps {
  value?: Dayjs | null
  onChange?: (date: Dayjs | null) => void
  placeholder?: string
  format?: string
  minDate?: Dayjs
  maxDate?: Dayjs
  allowClear?: boolean
  disabled?: boolean
}

interface WheelColumnProps {
  items: { value: number; label: string }[]
  value: number
  onChange: (value: number) => void
  itemHeight?: number
}

// Wheel column component for iOS-style scrolling
function WheelColumn({ items, value, onChange, itemHeight = 44 }: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const startYRef = useRef(0)
  const startScrollRef = useRef(0)
  const velocityRef = useRef(0)
  const lastYRef = useRef(0)
  const lastTimeRef = useRef(0)
  const animationRef = useRef<number>()

  const visibleItems = 5
  const containerHeight = itemHeight * visibleItems

  // Find current index
  const currentIndex = items.findIndex(item => item.value === value)

  // Scroll to selected item
  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (containerRef.current) {
      const scrollTop = index * itemHeight
      if (smooth) {
        containerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' })
      } else {
        containerRef.current.scrollTop = scrollTop
      }
    }
  }, [itemHeight])

  // Initial scroll to selected value
  useEffect(() => {
    if (currentIndex >= 0) {
      scrollToIndex(currentIndex, false)
    }
  }, [currentIndex, scrollToIndex])

  // Handle scroll end - snap to nearest item
  const handleScrollEnd = useCallback(() => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop
      const nearestIndex = Math.round(scrollTop / itemHeight)
      const clampedIndex = Math.max(0, Math.min(items.length - 1, nearestIndex))

      scrollToIndex(clampedIndex)

      if (items[clampedIndex] && items[clampedIndex].value !== value) {
        onChange(items[clampedIndex].value)
      }
    }
  }, [itemHeight, items, value, onChange, scrollToIndex])

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    startYRef.current = e.touches[0].clientY
    startScrollRef.current = containerRef.current?.scrollTop || 0
    lastYRef.current = e.touches[0].clientY
    lastTimeRef.current = Date.now()
    velocityRef.current = 0

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return

    const currentY = e.touches[0].clientY
    const diff = startYRef.current - currentY
    containerRef.current.scrollTop = startScrollRef.current + diff

    // Calculate velocity
    const now = Date.now()
    const dt = now - lastTimeRef.current
    if (dt > 0) {
      velocityRef.current = (lastYRef.current - currentY) / dt
    }
    lastYRef.current = currentY
    lastTimeRef.current = now
  }

  const handleTouchEnd = () => {
    setIsDragging(false)

    // Apply momentum scrolling
    if (Math.abs(velocityRef.current) > 0.5 && containerRef.current) {
      const momentum = velocityRef.current * 150
      const targetScroll = containerRef.current.scrollTop + momentum
      const targetIndex = Math.round(targetScroll / itemHeight)
      const clampedIndex = Math.max(0, Math.min(items.length - 1, targetIndex))

      scrollToIndex(clampedIndex)

      setTimeout(() => {
        if (items[clampedIndex] && items[clampedIndex].value !== value) {
          onChange(items[clampedIndex].value)
        }
      }, 300)
    } else {
      handleScrollEnd()
    }
  }

  // Click on item to select
  const handleItemClick = (index: number) => {
    scrollToIndex(index)
    if (items[index] && items[index].value !== value) {
      onChange(items[index].value)
    }
  }

  return (
    <div className="wheel-column">
      <div className="wheel-highlight" style={{ height: itemHeight }} />
      <div
        ref={containerRef}
        className="wheel-scroll-container"
        style={{ height: containerHeight }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onScroll={() => {
          if (!isDragging) {
            // Debounce scroll end detection
            if (animationRef.current) {
              cancelAnimationFrame(animationRef.current)
            }
            animationRef.current = requestAnimationFrame(() => {
              setTimeout(handleScrollEnd, 100)
            })
          }
        }}
      >
        {/* Padding items for centering */}
        <div style={{ height: itemHeight * 2 }} />

        {items.map((item, index) => (
          <div
            key={item.value}
            className={`wheel-item ${item.value === value ? 'selected' : ''}`}
            style={{ height: itemHeight }}
            onClick={() => handleItemClick(index)}
          >
            {item.label}
          </div>
        ))}

        {/* Padding items for centering */}
        <div style={{ height: itemHeight * 2 }} />
      </div>
    </div>
  )
}

export default function MobileDatePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày',
  format = 'DD/MM/YYYY',
  minDate,
  maxDate,
  allowClear = true,
  disabled = false,
}: MobileDatePickerProps) {
  const [open, setOpen] = useState(false)
  const [tempDate, setTempDate] = useState<{ day: number; month: number; year: number }>({
    day: value?.date() || dayjs().date(),
    month: (value?.month() || dayjs().month()) + 1,
    year: value?.year() || dayjs().year(),
  })

  // Update temp date when value changes
  useEffect(() => {
    if (value) {
      setTempDate({
        day: value.date(),
        month: value.month() + 1,
        year: value.year(),
      })
    }
  }, [value])

  // Generate options
  const currentYear = dayjs().year()
  const minYear = minDate?.year() || currentYear - 100
  const maxYear = maxDate?.year() || currentYear + 10

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => ({
    value: minYear + i,
    label: `${minYear + i}`,
  }))

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `Tháng ${i + 1}`,
  }))

  // Days depend on selected month/year
  const daysInMonth = dayjs(`${tempDate.year}-${tempDate.month}-01`).daysInMonth()
  const days = Array.from({ length: daysInMonth }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}`,
  }))

  // Adjust day if it exceeds days in month
  useEffect(() => {
    if (tempDate.day > daysInMonth) {
      setTempDate(prev => ({ ...prev, day: daysInMonth }))
    }
  }, [tempDate.month, tempDate.year, daysInMonth, tempDate.day])

  const handleConfirm = () => {
    const newDate = dayjs(`${tempDate.year}-${tempDate.month}-${tempDate.day}`)
    onChange?.(newDate)
    setOpen(false)
  }

  const handleClear = () => {
    onChange?.(null)
    setOpen(false)
  }

  const handleCancel = () => {
    // Reset to original value
    if (value) {
      setTempDate({
        day: value.date(),
        month: value.month() + 1,
        year: value.year(),
      })
    }
    setOpen(false)
  }

  const displayValue = value ? value.format(format) : ''

  return (
    <>
      <div
        className={`mobile-date-picker-input ${disabled ? 'disabled' : ''} ${value ? 'has-value' : ''}`}
        onClick={() => !disabled && setOpen(true)}
      >
        <CalendarOutlined className="picker-icon" />
        <span className={`picker-value ${!value ? 'placeholder' : ''}`}>
          {displayValue || placeholder}
        </span>
        {allowClear && value && !disabled && (
          <span
            className="picker-clear"
            onClick={(e) => {
              e.stopPropagation()
              onChange?.(null)
            }}
          >
            ×
          </span>
        )}
      </div>

      <Modal
        open={open}
        onCancel={handleCancel}
        footer={null}
        closable={false}
        centered
        className="mobile-date-picker-modal"
        maskClosable={true}
        width="100%"
        style={{ maxWidth: '100vw', margin: 0, padding: 0 }}
        styles={{
          content: { borderRadius: '16px 16px 0 0' },
          body: { padding: 0 }
        }}
        wrapClassName="mobile-date-picker-wrap"
      >
        <div className="mobile-date-picker-content">
          {/* Header */}
          <div className="picker-header">
            <Button type="text" onClick={handleCancel}>
              Hủy
            </Button>
            <span className="picker-title">Chọn ngày</span>
            <Button type="text" onClick={handleConfirm} className="confirm-btn">
              Xong
            </Button>
          </div>

          {/* Preview */}
          <div className="picker-preview">
            {dayjs(`${tempDate.year}-${tempDate.month}-${tempDate.day}`).format('dddd, DD/MM/YYYY')}
          </div>

          {/* Wheel Picker */}
          <div className="wheel-picker">
            <WheelColumn
              items={days}
              value={tempDate.day}
              onChange={(day) => setTempDate(prev => ({ ...prev, day }))}
            />
            <WheelColumn
              items={months}
              value={tempDate.month}
              onChange={(month) => setTempDate(prev => ({ ...prev, month }))}
            />
            <WheelColumn
              items={years}
              value={tempDate.year}
              onChange={(year) => setTempDate(prev => ({ ...prev, year }))}
            />
          </div>

          {/* Footer */}
          {allowClear && (
            <div className="picker-footer">
              <Button type="text" danger onClick={handleClear}>
                Xóa ngày đã chọn
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
