"use client";

import { DownloadIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { MembersListFilters } from "@/lib/members";
import {
  buildMemberExportHref,
  defaultMemberExportFieldKeys,
  memberExportFieldGroups,
  memberExportFields,
  memberExportFormats,
  normalizeMemberExportFields,
  type MemberExportFieldKey,
  type MemberExportFormat,
  type MemberExportScope,
} from "@/lib/members-export";

const FIELDS_STORAGE_KEY = "helm.members-export.fields";

const formatLabels: Record<MemberExportFormat, string> = {
  csv: "CSV",
  xlsx: "Excel (XLSX)",
};

function readStoredFields(): Array<MemberExportFieldKey> {
  try {
    const raw = window.localStorage.getItem(FIELDS_STORAGE_KEY);
    if (!raw) return defaultMemberExportFieldKeys;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultMemberExportFieldKeys;
    const fields = normalizeMemberExportFields(
      parsed.filter((value): value is string => typeof value === "string"),
    );
    return fields.length ? fields : defaultMemberExportFieldKeys;
  } catch {
    return defaultMemberExportFieldKeys;
  }
}

function storeFields(fields: Array<MemberExportFieldKey>) {
  try {
    window.localStorage.setItem(FIELDS_STORAGE_KEY, JSON.stringify(fields));
  } catch {
    // Storage can be unavailable (private mode); the selection just won't persist.
  }
}

export function ExportMembersDialog({
  filters,
  filteredCount,
}: {
  filteredCount: number;
  filters: MembersListFilters;
}) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<MemberExportFormat>("csv");
  const [scope, setScope] = useState<MemberExportScope>("all");
  const [emailsOnly, setEmailsOnly] = useState(false);
  const [fields, setFields] = useState<Array<MemberExportFieldKey>>(
    defaultMemberExportFieldKeys,
  );

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) setFields(readStoredFields());
  }

  function updateFields(nextFields: ReadonlyArray<string>) {
    const normalized = normalizeMemberExportFields(nextFields);
    setFields(normalized);
    storeFields(normalized);
  }

  function toggleField(key: MemberExportFieldKey, checked: boolean) {
    updateFields(
      checked ? [...fields, key] : fields.filter((field) => field !== key),
    );
  }

  function toggleGroup(
    groupKeys: Array<MemberExportFieldKey>,
    checked: boolean,
  ) {
    updateFields(
      checked
        ? [...fields, ...groupKeys]
        : fields.filter((field) => !groupKeys.includes(field)),
    );
  }

  const canExport = emailsOnly || fields.length > 0;
  const exportHref = buildMemberExportHref(
    { emailsOnly, fields, format, scope },
    filters,
  );

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <DownloadIcon />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Export members</DialogTitle>
          <DialogDescription>
            Download member records as a spreadsheet.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[65vh] gap-4 overflow-y-auto pr-1">
          <section className="grid gap-2">
            <h3 className="text-xs font-medium">Format</h3>
            <RadioGroup
              className="grid-cols-2"
              onValueChange={(value) => {
                const nextFormat = memberExportFormats.find(
                  (candidate) => candidate === value,
                );
                if (nextFormat) setFormat(nextFormat);
              }}
              value={format}
            >
              {memberExportFormats.map((value) => (
                <Label
                  className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-xs font-normal has-data-checked:border-primary"
                  htmlFor={`members-export-format-${value}`}
                  key={value}
                >
                  <RadioGroupItem
                    id={`members-export-format-${value}`}
                    value={value}
                  />
                  {formatLabels[value]}
                </Label>
              ))}
            </RadioGroup>
          </section>

          <section className="grid gap-2">
            <h3 className="text-xs font-medium">Members</h3>
            <RadioGroup
              onValueChange={(value) =>
                setScope(value === "filtered" ? "filtered" : "all")
              }
              value={scope}
            >
              <Label
                className="flex items-center gap-2 text-xs font-normal"
                htmlFor="members-export-scope-all"
              >
                <RadioGroupItem id="members-export-scope-all" value="all" />
                All members, including disabled
              </Label>
              <Label
                className="flex items-center gap-2 text-xs font-normal"
                htmlFor="members-export-scope-filtered"
              >
                <RadioGroupItem
                  id="members-export-scope-filtered"
                  value="filtered"
                />
                Current filtered view ({filteredCount}{" "}
                {filteredCount === 1 ? "member" : "members"})
              </Label>
            </RadioGroup>
          </section>

          <Separator />

          <Label
            className="flex items-center justify-between gap-4 text-xs font-normal"
            htmlFor="members-export-emails-only"
          >
            <span className="grid gap-0.5">
              <span className="font-medium">Export only emails</span>
              <span className="text-muted-foreground">
                One primary email per member, duplicates removed.
              </span>
            </span>
            <Switch
              checked={emailsOnly}
              id="members-export-emails-only"
              onCheckedChange={setEmailsOnly}
            />
          </Label>

          {emailsOnly ? null : (
            <section className="grid gap-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-medium">
                  Fields{" "}
                  <span className="font-normal text-muted-foreground">
                    ({fields.length} selected)
                  </span>
                </h3>
                <div className="flex gap-1">
                  <Button
                    onClick={() =>
                      updateFields(memberExportFields.map((field) => field.key))
                    }
                    size="xs"
                    type="button"
                    variant="ghost"
                  >
                    All
                  </Button>
                  <Button
                    onClick={() => updateFields(defaultMemberExportFieldKeys)}
                    size="xs"
                    type="button"
                    variant="ghost"
                  >
                    Defaults
                  </Button>
                  <Button
                    onClick={() => updateFields([])}
                    size="xs"
                    type="button"
                    variant="ghost"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {memberExportFieldGroups.map((group) => {
                  const groupFields = memberExportFields.filter(
                    (field) => field.group === group,
                  );
                  const groupKeys = groupFields.map((field) => field.key);
                  const selectedCount = groupKeys.filter((key) =>
                    fields.includes(key),
                  ).length;
                  const groupChecked =
                    selectedCount === groupKeys.length
                      ? true
                      : selectedCount > 0
                        ? "indeterminate"
                        : false;
                  const groupId = `members-export-group-${group.toLowerCase()}`;

                  return (
                    <fieldset
                      className="grid content-start gap-1.5"
                      key={group}
                    >
                      <Label
                        className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
                        htmlFor={groupId}
                      >
                        <Checkbox
                          checked={groupChecked}
                          id={groupId}
                          onCheckedChange={(checked) =>
                            toggleGroup(groupKeys, checked === true)
                          }
                        />
                        {group}
                      </Label>
                      <div className="grid gap-1.5 pl-6">
                        {groupFields.map((field) => {
                          const fieldId = `members-export-field-${field.key}`;
                          return (
                            <Label
                              className="flex items-center gap-2 text-xs font-normal"
                              htmlFor={fieldId}
                              key={field.key}
                            >
                              <Checkbox
                                checked={fields.includes(field.key)}
                                id={fieldId}
                                onCheckedChange={(checked) =>
                                  toggleField(field.key, checked === true)
                                }
                              />
                              {field.label}
                            </Label>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          {canExport ? (
            <Button asChild>
              <a download href={exportHref} onClick={() => setOpen(false)}>
                <DownloadIcon />
                Export {formatLabels[format].split(" ")[0]}
              </a>
            </Button>
          ) : (
            <Button disabled type="button">
              Select at least one field
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
