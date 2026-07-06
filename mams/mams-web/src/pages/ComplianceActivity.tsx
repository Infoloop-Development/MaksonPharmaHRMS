import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../store/auth";
import { activityApi } from "../api/activity";
import { AuditLogResults } from "../components/activity/AuditLogResults";
import { AuditLogTabBar } from "../components/activity/AuditLogTabBar";
import { TablePagination } from "../components/ui/TablePagination";
import type { AuditLogCategory } from "@mams/types";

const PAGE_SIZE = 50

export function ComplianceActivity(){
    const user = useAuth((s) => s.user);
    const canView = user?.permissions.includes('read.compliance_activity') ?? false;

    const [page,setPage] = useState(1);
    const [category,setCategory] = useState<AuditLogCategory>("all");
    const [search,setSearch] = useState('');
    const [debouncedSearch,setDebouncedSearch] = useState("");

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search),300);
        return () => clearTimeout(t);
    }, [search]);

    const { data, isLoading, error } = useQuery({
        queryKey: ['activity','compliance',page,category,debouncedSearch],
        queryFn: () =>
            activityApi.listOrg({
                page,
                pageSize: PAGE_SIZE,
                role: 'hr.compliance',
                category: category === 'all' ? undefined : category,
                search: debouncedSearch.trim() || undefined,
            }),
        enabled: canView,
    });

    if (!canView) {
        return <div className="text-sm text-text-muted">You don't have access to this page.</div>;
    }

    const total = data?.total ?? 0;
    const pageCount = Math.max(1,Math.ceil(total / PAGE_SIZE));

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-bold">Compliance Activity</h1>
                <p className="text-sm text-text-muted mt-1">Everything done from the compliance login</p>
            </div>

            <AuditLogTabBar
                category={category}
                onCategoryChange={(next) => {
                    setCategory(next);
                    setPage(1);
                }}
            />

            <div className="card p-4 mb-4">
                <label className="text-sm block">
                    <span className="label block mb-1">Search</span>
                    <input
                        className="input"
                        type="search"
                        value={search}
                        placeholder="Search events..."
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </label>
            </div>

            <div className="card p-4">
                <AuditLogResults items={data?.items} isLoading={isLoading} error={error} />

                {total > PAGE_SIZE && (
                    <TablePagination
                        page={page}
                        totalPages={pageCount}
                        total={total}
                        showTotal
                        onPrev={() => setPage((p) => p - 1)}
                        onNext={() => setPage((p) => p + 1)}
                    />
                )}

            </div>

        </div>
    )

}