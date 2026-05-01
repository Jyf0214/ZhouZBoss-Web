---
name: Bug Report
description: 报告一个 Bug
title: "[Bug] "
labels: ["bug"]
assignees: []
fields:
  - name: environment
    label: 环境
    type: dropdown
    options:
      - Production
      - Staging
      - Development
    required: true
  - name: description
    label: 问题描述
    type: textarea
    required: true
  - name: steps
    label: 复现步骤
    type: textarea
    required: true
  - name: expected
    label: 期望行为
    type: textarea
    required: false
  - name: screenshots
    label: 截图
    type: textarea
    required: false
---

## 环境
{{environment}}

## 问题描述
{{description}}

## 复现步骤
{{steps}}

## 期望行为
{{expected}}

## 截图
{{screenshots}}
