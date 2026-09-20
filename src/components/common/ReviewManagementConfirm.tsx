import { App, Modal } from 'antd';
import { useActionAccess } from '@/hooks/useActionAccess';
import { useBusinessStore } from '@/mock/store';
import { useAppStore } from '@/store/useAppStore';

/**
 * review-management（管理决策原审批）同意/驳回的公共确认框。
 * 文案与行为基准：确认框内展示申请方案与审批意见；确认按钮受
 * 「集团领导 + 待审批 + canDo(review-management)」准入控制；确认时提交
 * review-management 动作并提示「审批已记录，待决策事项已联动」。
 * 供 ManagementApprovalPage 与 UnsignedProjectTab 两个入口复用。
 */
export function ReviewManagementConfirm({ open, approve, approvalId, opinion, reason, onClose }: {
  /** 是否显示确认框（受控） */
  open: boolean;
  /** true=同意申请，false=驳回申请 */
  approve: boolean;
  /** 目标管理审批单 id */
  approvalId: string;
  /** 随确认提交的审批意见 */
  opinion: string;
  /** 申请方案说明，展示在确认框内 */
  reason?: string;
  /** 取消/关闭回调（审批成功后同样以此关闭） */
  onClose: () => void;
}) {
  const { canDo } = useActionAccess();
  const dispatch = useBusinessStore((s) => s.dispatch);
  const approval = useBusinessStore((s) => s.data.managementApprovals.find((a) => a.id === approvalId));
  const { currentRole, currentUser } = useAppStore();
  const { message } = App.useApp();
  const permitted = currentRole === 'executive' && approval?.status === '待审批' && canDo('review-management', approvalId);
  return (
    <Modal
      title={approve ? '确认同意申请' : '确认驳回申请'}
      open={open}
      okButtonProps={{ disabled: !permitted }}
      onCancel={onClose}
      onOk={() => {
        if (!permitted || !canDo('review-management', approvalId)) return;
        try {
          dispatch({ type: 'review-management', id: approvalId, approve, opinion }, { id: currentUser.id, name: currentUser.name, role: currentRole });
          onClose();
          message.success('审批已记录，待决策事项已联动');
        } catch (error) {
          message.error((error as Error).message);
        }
      }}
    >
      <p>{reason}</p>
      <p>审批意见：{opinion}</p>
    </Modal>
  );
}
