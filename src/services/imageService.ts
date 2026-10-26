/**
 * Đọc ảnh người dùng chọn và thu nhỏ thành JPEG để lưu được trong localStorage
 * (ảnh điện thoại 3–5MB sẽ còn khoảng 60–120KB).
 */
export function readImage(file: File, maxSide = 900, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Chỉ nhận file ảnh'))
    if (file.size > 10 * 1024 * 1024) return reject(new Error('Ảnh tối đa 10MB'))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Không đọc được ảnh'))
    }
    img.src = url
  })
}
