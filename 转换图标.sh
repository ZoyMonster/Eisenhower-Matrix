#!/bin/bash
# 图标转换脚本

# 检查源文件
if [ ! -f "build/icon.icns" ]; then
    echo "错误: 找不到 build/icon.icns 文件"
    exit 1
fi

# 检测文件类型
file_type=$(file -b --mime-type build/icon.icns)
echo "检测到文件类型: $file_type"

# 如果是 JPEG，先转换为 PNG
if [[ "$file_type" == *"jpeg"* ]] || [[ "$file_type" == *"jpg"* ]]; then
    echo "检测到 JPEG 文件，正在转换为 PNG..."
    sips -s format png build/icon.icns --out build/icon_temp.png
    source_file="build/icon_temp.png"
else
    source_file="build/icon.icns"
fi

# 创建 iconset 目录
rm -rf icon.iconset
mkdir -p icon.iconset

# 生成所有尺寸
echo "正在生成各个尺寸..."
sips -z 16 16     "$source_file" --out icon.iconset/icon_16x16.png
sips -z 32 32     "$source_file" --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     "$source_file" --out icon.iconset/icon_32x32.png
sips -z 64 64     "$source_file" --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   "$source_file" --out icon.iconset/icon_128x128.png
sips -z 256 256   "$source_file" --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   "$source_file" --out icon.iconset/icon_256x256.png
sips -z 512 512   "$source_file" --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   "$source_file" --out icon.iconset/icon_512x512.png
sips -z 1024 1024 "$source_file" --out icon.iconset/icon_512x512@2x.png

# 转换为 ICNS
echo "正在转换为 ICNS 格式..."
iconutil -c icns icon.iconset -o build/icon.icns

# 清理临时文件
rm -rf icon.iconset
if [ -f "build/icon_temp.png" ]; then
    rm build/icon_temp.png
fi

echo "完成！ICNS 文件已生成: build/icon.icns"
file build/icon.icns


