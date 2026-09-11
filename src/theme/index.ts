import { ThemeConfig } from 'antd';

export const pmsTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1d4ed8', // 国际深邃海蓝 (blue-700)
    colorPrimaryHover: '#2563eb',
    colorSuccess: '#10b981', // 柔和翡翠绿 (emerald-500)
    colorWarning: '#d97706', // 琥珀黄 (amber-600)
    colorError: '#e11d48',   // 浆果玫红 (rose-600)
    colorInfo: '#1d4ed8',
    colorTextBase: '#0f172a', // slate-900 (主文本色)
    colorTextSecondary: '#334155', // slate-700 (次级文本色)
    colorTextTertiary: '#64748b', // slate-500 (三级辅助/标签文本色)
    colorTextQuaternary: '#94a3b8', // slate-400 (弱化/占位文本色)
    colorBgBase: '#ffffff',
    colorBorder: 'rgba(226, 232, 240, 0.9)', // 柔和微透半透明描边
    borderRadius: 8,          // rounded-lg
    // =========================================================================
    // 统一专业排版体系 (Typography Scale & Stacks)
    // =========================================================================
    fontSize: 14,
    fontSizeHeading1: 24, // 核心指标 Display / 顶级统计
    fontSizeHeading2: 20, // 页面主标题 Page Title
    fontSizeHeading3: 16, // 区块级标题 Section Title
    fontSizeHeading4: 14, // 卡片级标题 Card Title
    fontSizeHeading5: 13, // 表头/紧凑标题 Table Header
    fontSizeSM: 12,       // 辅助注释 Caption / 标签 Tag
    lineHeight: 1.5714,   // 标准正文行高
    lineHeightHeading1: 1.3333,
    lineHeightHeading2: 1.4,
    lineHeightHeading3: 1.5,
    fontFamily: `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif`,
    fontFamilyCode: `"JetBrains Mono", "SF Mono", Consolas, Menlo, monospace`,
    // 标准 4px/8px 空间网格系统 (8pt Grid System)
    sizeStep: 4,
    sizeUnit: 4,
  },
  components: {
    Typography: {
      titleMarginBottom: 0,
      titleMarginTop: 0,
    },
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 64,
      headerPadding: '0 20px',
      siderBg: '#0f172a', // slate-900
    },
    Menu: {
      darkItemBg: '#0f172a',
      darkSubMenuItemBg: '#090d16',
      darkItemSelectedBg: '#2563eb',
      darkItemColor: '#94a3b8',
      darkItemSelectedColor: '#ffffff',
      itemMarginInline: 8,
    },
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#334155',
      rowHoverBg: '#f1f5f9',
      borderColor: '#e2e8f0',
      fontSize: 13,
      headerSplitColor: '#e2e8f0',
      cellPaddingBlockMD: 10,
      cellPaddingInlineMD: 12,
      cellPaddingBlockSM: 8,
      cellPaddingInlineSM: 12,
    },
    Card: {
      headerHeight: 48,
      colorBorderSecondary: '#e2e8f0',
      borderRadiusLG: 10,
      paddingLG: 16,
    },
    Button: {
      borderRadius: 6,
      controlHeight: 34,
      contentFontSize: 13,
      paddingInline: 12,
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Tabs: {
      horizontalMargin: '0 0 16px 0',
    },
    Pagination: {
      itemSize: 32,
      itemSizeSM: 26,
      fontSize: 13,
      borderRadius: 6,
    },
    Descriptions: {
      padding: 12,
      paddingSM: 8,
    },
  },
};
