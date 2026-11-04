import './AlertStack.css';
import { BsCheckCircleFill, BsExclamationCircleFill, BsExclamationTriangleFill, BsInfoCircleFill, BsX } from 'react-icons/bs';
import type { AlertItem } from '../alerts/AlertContext';

// This component is what the alerts from AlertContext look like: small cards stacked at the top of the screen, each with an icon colored by its type, the message, and an X to dismiss it.
// AlertProvider renders it once for the whole app, so components never render this themselves, they just call showAlert.
interface AlertStackProps {
    alerts: AlertItem[],
    onDismiss: (id: number) => void,
}

// The icon shown for each type of alert.
const ICONS = {
    success: <BsCheckCircleFill />,
    error: <BsExclamationCircleFill />,
    warning: <BsExclamationTriangleFill />,
    info: <BsInfoCircleFill />,
};

const AlertStack = ({ alerts, onDismiss }: AlertStackProps) => {
    return (
        // aria-live makes screen readers read out new alerts as they appear.
        <div className='alert-stack' aria-live='polite'>
            {alerts.map((alert) => (
                // Errors use role="alert", which screen readers announce right away (interrupting whatever they were reading), since those usually need attention.
                <div
                    key={alert.id}
                    role={alert.type === 'error' ? 'alert' : 'status'}
                    className={`alert-stack-item alert-stack-item-${alert.type}${alert.leaving ? ' alert-stack-item-leaving' : ''}`}
                >
                    <span className='alert-stack-icon'>{ICONS[alert.type]}</span>
                    <p className='alert-stack-message'>{alert.message}</p>
                    <button className='alert-stack-close' onClick={() => onDismiss(alert.id)} aria-label="Dismiss">
                        <BsX />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default AlertStack;
