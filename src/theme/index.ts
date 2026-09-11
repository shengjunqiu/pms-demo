import { ThemeConfig } from 'antd';

export const pmsTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2563eb', // PMS Blue (blue-600)
    colorSuccess: '#10b981', // emerald-500
    colorWarning: '#f59e0b', // amber-500
    colorError: '#ef4444',   // rose-500
    colorInfo: '#2563eb',
    colorTextBase: '#0f172a', // slate-900
    colorBgBase: '#ffffff',
    colorBorder: '#e2e8f0',   // slate-200
    borderRadius: 8,          // rounded-lg
    fontSize: 14,
    fontFamily: `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif`,
    fontFamilyCode: `"JetBrains Mono", "SF Mono", Consolas, Menlo, monospace`,
    // 标准 4px/8px 空间网格系统 (8pt Grid System)
    sizeStep: 4,
    sizeUnit: 4,
  },
  components: {
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
