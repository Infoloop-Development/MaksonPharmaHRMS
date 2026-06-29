import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { Badge } from "../components/ui/Badge";
import { SectionCard } from "./Settings";

export function ComplianceSettings(){
    const user = useAuth((s) => s.user);
    const navigate = useNavigate();

    if (!user) return null;

    return (
        <div className="max-w-3xl space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold">My Profile</h1>
                <p className="text-sm text-text-muted mt-1">Your account profile and security</p>
            </div>

            <div className="card p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center font-bold text-base text-primary shrink-0">
                    {user.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-base font-bold truncate">{user.name}</div>
                    <div className="text-sm text-text-muted truncate">{user.email}</div>
                </div>
                <Badge tone="blue">{user.role.replace(/_/g, ' ')}</Badge>
            </div>

            <SectionCard title="Security">
                <p className="text-sm text-text-muted">Update your account password.</p>
                <button
                    type="button"
                    className="btn-outline btn-sm"
                    onClick={() => navigate('/change-password')}
                >
                    Change Password
                </button>
            </SectionCard>
        </div>
    );
}