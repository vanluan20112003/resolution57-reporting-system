import { useState, useEffect } from 'react'
import { Modal, Spin, Result, Button, Space, Typography, Tooltip } from 'antd'
import {
  DownloadOutlined,
  ExpandOutlined,
  CompressOutlined,
  LeftOutlined,
  RightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  RotateRightOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileImageOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'

const { Text, Title } = Typography

export interface FileViewerFile {
  id: string
  file_name: string
  file_url?: string
  download_url?: string
  file_extension?: string
  source_type?: 'upload' | 'link'
}

interface FileViewerProps {
  visible: boolean
  file: FileViewerFile | null
  files?: FileViewerFile[] // For navigation between files
  onClose: () => void
  onNavigate?: (file: FileViewerFile) => void
}

// Supported file types
const SUPPORTED_IMAGES = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
const SUPPORTED_DOCUMENTS = ['pdf']
const SUPPORTED_SPREADSHEETS = ['xlsx', 'xls', 'csv']
const SUPPORTED_WORD = ['docx']
const SUPPORTED_TEXT = ['txt', 'json', 'xml', 'html', 'css', 'js', 'ts', 'md']
const SUPPORTED_VIDEO = ['mp4', 'webm', 'ogg']
const SUPPORTED_AUDIO = ['mp3', 'wav', 'ogg', 'aac']

type FileType = 'image' | 'pdf' | 'spreadsheet' | 'word' | 'text' | 'video' | 'audio' | 'unsupported'

const getFileType = (extension?: string): FileType => {
  const ext = (extension || '').toLowerCase()
  if (SUPPORTED_IMAGES.includes(ext)) return 'image'
  if (SUPPORTED_DOCUMENTS.includes(ext)) return 'pdf'
  if (SUPPORTED_SPREADSHEETS.includes(ext)) return 'spreadsheet'
  if (SUPPORTED_WORD.includes(ext)) return 'word'
  if (SUPPORTED_TEXT.includes(ext)) return 'text'
  if (SUPPORTED_VIDEO.includes(ext)) return 'video'
  if (SUPPORTED_AUDIO.includes(ext)) return 'audio'
  return 'unsupported'
}

const getFileIcon = (extension?: string) => {
  const type = getFileType(extension)
  switch (type) {
    case 'image':
      return <FileImageOutlined style={{ fontSize: 48, color: '#722ed1' }} />
    case 'pdf':
      return <FilePdfOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
    case 'spreadsheet':
      return <FileExcelOutlined style={{ fontSize: 48, color: '#52c41a' }} />
    case 'word':
      return <FileWordOutlined style={{ fontSize: 48, color: '#1890ff' }} />
    case 'text':
      return <FileTextOutlined style={{ fontSize: 48, color: '#666' }} />
    default:
      return <FileOutlined style={{ fontSize: 48, color: '#666' }} />
  }
}

// Image Viewer Component
const ImageViewer = ({ url, fileName }: { url: string; fileName: string }) => {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)
  const handleReset = () => {
    setZoom(1)
    setRotation(0)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'center', gap: 8 }}>
        <Tooltip title="Thu nhỏ">
          <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut} disabled={zoom <= 0.25} />
        </Tooltip>
        <Text style={{ lineHeight: '32px', minWidth: 60, textAlign: 'center' }}>{Math.round(zoom * 100)}%</Text>
        <Tooltip title="Phóng to">
          <Button icon={<ZoomInOutlined />} onClick={handleZoomIn} disabled={zoom >= 3} />
        </Tooltip>
        <Tooltip title="Xoay">
          <Button icon={<RotateRightOutlined />} onClick={handleRotate} />
        </Tooltip>
        <Tooltip title="Đặt lại">
          <Button onClick={handleReset}>Reset</Button>
        </Tooltip>
      </div>
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
          padding: 16,
        }}
      >
        <img
          src={url}
          alt={fileName}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 0.3s ease',
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  )
}

// PDF Viewer Component
const PDFViewer = ({ url }: { url: string }) => {
  return (
    <iframe
      src={`${url}#toolbar=1&navpanes=0`}
      style={{ width: '100%', height: '100%', border: 'none' }}
      title="PDF Viewer"
    />
  )
}

// Excel/CSV Viewer Component
const SpreadsheetViewer = ({ url, extension }: { url: string; extension: string }) => {
  const [data, setData] = useState<any[][] | null>(null)
  const [sheets, setSheets] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSpreadsheet = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(url)
        const arrayBuffer = await response.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })

        setSheets(workbook.SheetNames)
        setActiveSheet(workbook.SheetNames[0])

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
        setData(jsonData as any[][])
      } catch (err: any) {
        setError(err.message || 'Không thể đọc file')
      } finally {
        setLoading(false)
      }
    }

    loadSpreadsheet()
  }, [url])

  const handleSheetChange = (sheetName: string) => {
    setActiveSheet(sheetName)
    // Re-parse for selected sheet
    fetch(url)
      .then(res => res.arrayBuffer())
      .then(buffer => {
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 })
        setData(jsonData as any[][])
      })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spin size="large" tip="Đang tải bảng tính..." />
      </div>
    )
  }

  if (error) {
    return (
      <Result
        status="error"
        title="Không thể đọc file"
        subTitle={error}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {sheets.length > 1 && (
        <div style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
          <Space>
            <Text>Sheet:</Text>
            {sheets.map(sheet => (
              <Button
                key={sheet}
                type={activeSheet === sheet ? 'primary' : 'default'}
                size="small"
                onClick={() => handleSheetChange(sheet)}
              >
                {sheet}
              </Button>
            ))}
          </Space>
        </div>
      )}
      <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <tbody>
            {data?.map((row, rowIndex) => (
              <tr key={rowIndex} style={{ background: rowIndex === 0 ? '#fafafa' : 'white' }}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    style={{
                      border: '1px solid #e8e8e8',
                      padding: '6px 10px',
                      fontWeight: rowIndex === 0 ? 600 : 400,
                      whiteSpace: 'nowrap',
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={String(cell || '')}
                  >
                    {cell !== null && cell !== undefined ? String(cell) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Word Document Viewer Component
const WordViewer = ({ url }: { url: string }) => {
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDocument = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(url)
        const arrayBuffer = await response.arrayBuffer()
        const result = await mammoth.convertToHtml({ arrayBuffer })
        setHtml(result.value)
      } catch (err: any) {
        setError(err.message || 'Không thể đọc file Word')
      } finally {
        setLoading(false)
      }
    }

    loadDocument()
  }, [url])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spin size="large" tip="Đang tải tài liệu..." />
      </div>
    )
  }

  if (error) {
    return (
      <Result
        status="error"
        title="Không thể đọc file"
        subTitle={error}
      />
    )
  }

  return (
    <div
      style={{
        padding: '24px 48px',
        background: 'white',
        height: '100%',
        overflow: 'auto',
        fontFamily: 'Times New Roman, serif',
        fontSize: 14,
        lineHeight: 1.6,
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// Text Viewer Component
const TextViewer = ({ url, extension }: { url: string; extension: string }) => {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadText = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(url)
        const text = await response.text()
        setContent(text)
      } catch (err: any) {
        setError(err.message || 'Không thể đọc file')
      } finally {
        setLoading(false)
      }
    }

    loadText()
  }, [url])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spin size="large" tip="Đang tải nội dung..." />
      </div>
    )
  }

  if (error) {
    return (
      <Result
        status="error"
        title="Không thể đọc file"
        subTitle={error}
      />
    )
  }

  const isCode = ['json', 'js', 'ts', 'css', 'html', 'xml'].includes(extension.toLowerCase())

  return (
    <pre
      style={{
        margin: 0,
        padding: 16,
        background: isCode ? '#1e1e1e' : '#fafafa',
        color: isCode ? '#d4d4d4' : '#333',
        height: '100%',
        overflow: 'auto',
        fontFamily: 'Consolas, Monaco, monospace',
        fontSize: 13,
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
      }}
    >
      {content}
    </pre>
  )
}

// Video Viewer Component
const VideoViewer = ({ url }: { url: string }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#000' }}>
      <video
        src={url}
        controls
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      >
        Trình duyệt không hỗ trợ xem video.
      </video>
    </div>
  )
}

// Audio Viewer Component
const AudioViewer = ({ url, fileName }: { url: string; fileName: string }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24 }}>
      <FileOutlined style={{ fontSize: 64, color: '#1890ff' }} />
      <Title level={4} style={{ margin: 0 }}>{fileName}</Title>
      <audio src={url} controls style={{ width: '80%', maxWidth: 500 }}>
        Trình duyệt không hỗ trợ nghe audio.
      </audio>
    </div>
  )
}

// Unsupported File Component
const UnsupportedFile = ({ file, onDownload }: { file: FileViewerFile; onDownload: () => void }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
      {getFileIcon(file.file_extension)}
      <Title level={4} style={{ margin: 0 }}>{file.file_name}</Title>
      <Text type="secondary">Không hỗ trợ xem trực tiếp loại file này</Text>
      <Button type="primary" icon={<DownloadOutlined />} onClick={onDownload}>
        Tải xuống để xem
      </Button>
    </div>
  )
}

function FileViewer({ visible, file, files = [], onClose, onNavigate }: FileViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!file) return null

  const fileUrl = file.download_url || file.file_url || ''
  const extension = file.file_extension || file.file_name?.split('.').pop() || ''
  const fileType = getFileType(extension)

  // Find current index for navigation
  const currentIndex = files.findIndex(f => f.id === file.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < files.length - 1

  const handlePrev = () => {
    if (hasPrev && onNavigate) {
      onNavigate(files[currentIndex - 1])
    }
  }

  const handleNext = () => {
    if (hasNext && onNavigate) {
      onNavigate(files[currentIndex + 1])
    }
  }

  const handleDownload = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank')
    }
  }

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const renderContent = () => {
    if (!fileUrl) {
      return (
        <Result
          status="warning"
          title="Không có đường dẫn file"
          subTitle="File này không có đường dẫn để xem"
        />
      )
    }

    switch (fileType) {
      case 'image':
        return <ImageViewer url={fileUrl} fileName={file.file_name} />
      case 'pdf':
        return <PDFViewer url={fileUrl} />
      case 'spreadsheet':
        return <SpreadsheetViewer url={fileUrl} extension={extension} />
      case 'word':
        return <WordViewer url={fileUrl} />
      case 'text':
        return <TextViewer url={fileUrl} extension={extension} />
      case 'video':
        return <VideoViewer url={fileUrl} />
      case 'audio':
        return <AudioViewer url={fileUrl} fileName={file.file_name} />
      default:
        return <UnsupportedFile file={file} onDownload={handleDownload} />
    }
  }

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 40 }}>
          {getFileIcon(extension)}
          <Text ellipsis style={{ flex: 1 }} title={file.file_name}>
            {file.file_name}
          </Text>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            {files.length > 1 && (
              <>
                <Button icon={<LeftOutlined />} disabled={!hasPrev} onClick={handlePrev}>
                  Trước
                </Button>
                <Text type="secondary">
                  {currentIndex + 1} / {files.length}
                </Text>
                <Button icon={<RightOutlined />} disabled={!hasNext} onClick={handleNext}>
                  Sau
                </Button>
              </>
            )}
          </Space>
          <Space>
            <Button icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />} onClick={handleFullscreen}>
              {isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
              Tải xuống
            </Button>
          </Space>
        </div>
      }
      width={isFullscreen ? '100vw' : '80vw'}
      style={isFullscreen ? { top: 0, padding: 0, maxWidth: '100vw' } : { top: 20 }}
      styles={{
        body: {
          height: isFullscreen ? 'calc(100vh - 110px)' : '70vh',
          padding: 0,
          overflow: 'hidden',
        },
      }}
      destroyOnClose
    >
      {renderContent()}
    </Modal>
  )
}

export default FileViewer
