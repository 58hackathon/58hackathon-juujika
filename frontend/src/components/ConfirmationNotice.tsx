import { useId } from "react";
import "./ConfirmationNotice.css";

type ConfirmationNoticeDetail = {
    label: string;
    value: string;
};

type ConfirmationNoticeProps = {
    cancelLabel?: string;
    confirmLabel: string;
    description: string;
    details?: ConfirmationNoticeDetail[];
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    title: string;
};

function ConfirmationNotice({
    cancelLabel = "戻る",
    confirmLabel,
    description,
    details = [],
    isOpen,
    onCancel,
    onConfirm,
    title,
}: ConfirmationNoticeProps) {
    const titleId = useId();
    const descriptionId = useId();

    if (!isOpen) return null;

    return (
        <div
            className="confirmation-notice"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
        >
            <div className="confirmation-notice__sheet">
                <div className="confirmation-notice__mark" aria-hidden="true">
                    !
                </div>
                <div className="confirmation-notice__content">
                    <p className="confirmation-notice__eyebrow">最終確認</p>
                    <h2 id={titleId}>{title}</h2>
                    <p id={descriptionId}>{description}</p>
                </div>

                {details.length > 0 && (
                    <dl className="confirmation-notice__details">
                        {details.map((detail) => (
                            <div className="confirmation-notice__detail" key={detail.label}>
                                <dt>{detail.label}</dt>
                                <dd>{detail.value}</dd>
                            </div>
                        ))}
                    </dl>
                )}

                <div className="confirmation-notice__actions">
                    <button
                        className="confirmation-notice__button confirmation-notice__button--secondary"
                        onClick={onCancel}
                        type="button"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        className="confirmation-notice__button confirmation-notice__button--primary"
                        onClick={onConfirm}
                        type="button"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmationNotice;
