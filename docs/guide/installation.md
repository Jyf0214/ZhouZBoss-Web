# 安装指南

## 系统要求

- Linux 内核 5.4+
- 至少 4GB 内存
- 10GB 可用磁盘空间

## 安装步骤

### 1. 安装依赖

```bash
sudo apt update
sudo apt install build-essential cmake git
```

### 2. 克隆仓库

```bash
git clone https://github.com/your-org/originium-kernel.git
cd originium-kernel
```

### 3. 配置

```bash
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
```

### 4. 编译

```bash
make -j$(nproc)
```

### 5. 安装

```bash
sudo make install
```

## 验证安装

```bash
originium-kernel --version
```
