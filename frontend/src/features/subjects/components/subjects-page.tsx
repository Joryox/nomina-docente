"use client";

import { BookOpen, MoreHorizontal, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/domain/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { APP_ROUTES } from "@/constants/routes";
import { SCREENS } from "@/constants/screens";
import { TEXTS } from "@/constants/texts";
import { toUserMessage } from "@/lib/api-error";
import type { ApiSchemas } from "@/lib/api-types";
import { toPaginationState } from "@/lib/pagination";
import { useDebouncedValue } from "@/lib/use-debounced-value";

import { useReactivateSubject, useRemoveSubject, useSubjects } from "../hooks/use-subjects";
import type { Subject } from "../types/subjects";
import { SubjectFormDialog } from "./subject-form-dialog";

const texts = SCREENS.subjects;
const common = SCREENS.common;
type StatusFilter = ApiSchemas["StatusFilter"];
const STATUS_OPTIONS: readonly StatusFilter[] = ["active", "inactive", "all"];

/** Mis materias: búsqueda sin acentos, alta y edición en diálogo, baja con explicación. */
export function SubjectsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [page, setPage] = useState(1);
  const term = useDebouncedValue(search.trim());
  const subjects = useSubjects({ search: term || undefined, status, page });
  const filtered = term !== "" || status !== "active";

  const columns: DataTableColumn<Subject>[] = [
    {
      id: "name",
      header: texts.columns.name,
      primary: true,
      sortValue: (subject) => subject.name,
      cell: (subject) => (
        <div className="grid gap-0.5">
          <span className="font-semibold text-fg">{subject.name}</span>
          <span className="text-small text-fg-muted">{subject.code ?? texts.noCode}</span>
        </div>
      ),
    },
    {
      id: "classes",
      header: texts.columns.classes,
      cell: (subject) =>
        texts.classesCount(subject.active_assignment_count, subject.assignment_count),
    },
    {
      id: "status",
      header: texts.columns.status,
      cell: (subject) => <StatusBadge status={subject.is_active ? "active" : "inactive"} />,
    },
    {
      id: "actions",
      header: common.actions,
      align: "end",
      cell: (subject) => <SubjectActions subject={subject} />,
    },
  ];

  return (
    <>
      <PageHeader
        title={texts.title}
        description={texts.description}
        actions={
          <SubjectFormDialog
            trigger={
              <Button>
                <Plus aria-hidden="true" />
                {texts.add}
              </Button>
            }
          />
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <Field label={texts.searchLabel} className="w-full sm:w-80">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted"
            />
            <Input
              type="search"
              value={search}
              placeholder={texts.searchPlaceholder}
              className="pl-9"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </Field>
        <Field label={common.status.label} className="w-full sm:w-48">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as StatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {common.status[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      {subjects.isError ? (
        <Alert
          tone="danger"
          title={common.loadError}
          announce
          action={
            <Button variant="outline" size="sm" onClick={() => void subjects.refetch()}>
              {TEXTS.ui.retry}
            </Button>
          }
        >
          {toUserMessage(subjects.error)}
        </Alert>
      ) : (
        <DataTable
          caption={texts.caption}
          columns={columns}
          rows={subjects.data?.items ?? []}
          getRowId={(subject) => subject.id}
          loading={subjects.isPending}
          pagination={
            subjects.data && subjects.data.total_pages > 1
              ? { ...toPaginationState(subjects.data), onPageChange: setPage }
              : undefined
          }
          empty={
            filtered ? (
              <EmptyState
                icon={Search}
                title={term ? texts.noMatches(term) : texts.noMatches("")}
                description={texts.noMatchesHint}
              />
            ) : (
              <EmptyState
                icon={BookOpen}
                title={texts.empty}
                description={texts.emptyHint}
                action={
                  <SubjectFormDialog
                    trigger={
                      <Button>
                        <Plus aria-hidden="true" />
                        {texts.add}
                      </Button>
                    }
                  />
                }
              />
            )
          }
        />
      )}
    </>
  );
}

type Action = "edit" | "remove" | null;

function SubjectActions({ subject }: { subject: Subject }) {
  const [action, setAction] = useState<Action>(null);
  const reactivate = useReactivateSubject();

  const onReactivate = () =>
    reactivate.mutate(subject.id, {
      onSuccess: () => toast.success(texts.remove.reactivated(subject.name)),
      onError: (error) => toast.error(toUserMessage(error)),
    });

  return (
    <>
      {/* No modal: el menú abre diálogos y no debe atrapar el foco al cerrarse. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={common.moreActions(subject.name)}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setAction("edit")}>
            <Pencil aria-hidden="true" />
            {common.edit}
          </DropdownMenuItem>
          {subject.is_active ? (
            <DropdownMenuItem tone="danger" onSelect={() => setAction("remove")}>
              <Trash2 aria-hidden="true" />
              {subject.assignment_count > 0 ? common.deactivate : common.delete}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled={reactivate.isPending} onSelect={onReactivate}>
              <RotateCcw aria-hidden="true" />
              {common.reactivate}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {action === "edit" ? (
        <SubjectFormDialog subject={subject} open onOpenChange={(open) => !open && setAction(null)} />
      ) : null}
      {action === "remove" ? (
        <RemoveSubjectDialog subject={subject} onClose={() => setAction(null)} />
      ) : null}
    </>
  );
}

/**
 * Quitar una materia (RN-32): se borra si nunca se usó, se desactiva si tiene historial, y
 * con clases activas no se puede: se explica antes de intentarlo.
 */
function RemoveSubjectDialog({ subject, onClose }: { subject: Subject; onClose: () => void }) {
  const remove = useRemoveSubject();
  const changeOpen = (open: boolean) => !open && onClose();

  if (subject.active_assignment_count > 0) {
    return (
      <Dialog open onOpenChange={changeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{texts.remove.blockedTitle(subject.name)}</DialogTitle>
            <DialogDescription>{texts.remove.blockedBody}</DialogDescription>
          </DialogHeader>
          <DialogBody />
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {texts.remove.understood}
            </Button>
            <Button asChild>
              <Link href={APP_ROUTES.assignments}>{texts.remove.goToClasses}</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const hasHistory = subject.assignment_count > 0;
  const confirm = async () => {
    try {
      const result = await remove.mutateAsync(subject.id);
      toast.success(
        result.outcome === "deleted"
          ? texts.remove.deleted(subject.name)
          : texts.remove.deactivated(subject.name),
      );
    } catch (error) {
      toast.error(toUserMessage(error));
      throw error;
    }
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={changeOpen}
      title={
        hasHistory ? texts.remove.deactivateTitle(subject.name) : texts.remove.deleteTitle(subject.name)
      }
      description={hasHistory ? texts.remove.deactivateBody : texts.remove.deleteBody}
      consequences={hasHistory ? texts.remove.deactivateConsequences : []}
      confirmLabel={hasHistory ? texts.remove.deactivateConfirm : texts.remove.deleteConfirm}
      irreversible={!hasHistory}
      onConfirm={confirm}
    />
  );
}
