"use client";

import { ArrowDown, ArrowUp, Check, ChevronRight, Eye, MoreHorizontal, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button as TamaguiButton, Checkbox, Label, Menu, TextArea } from "tamagui";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { OperationSelect } from "@/components/ui/operation-select";
import { PreviewSheet } from "@/components/ui/preview-sheet";
import { registrationFieldPresets, type RegistrationField } from "@/lib/registration-fields";
import type { EventSummary } from "@/types/domain";
import "./operations-workspaces.css";

function fieldId(prefix = "question") {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function newField(): RegistrationField {
  return { id: fieldId(), label: "New question", type: "TEXT", required: false, helpText: "", options: [] };
}

function typeAllowed(field: RegistrationField, type: RegistrationField["type"]) {
  if (field.mapping === "ALLERGENS") return type === "MULTISELECT";
  if (field.mapping === "GUEST") return type === "GUEST";
  if (field.mapping === "WORK_CENTER" || field.mapping === "MENU") return type === "SELECT";
  if (field.mapping === "EMAIL" || field.mapping === "PHONE") return type === "TEXT";
  return true;
}

function PreviewQuestion({ field }: { field: RegistrationField }) {
  const label = `${field.label}${field.required ? " *" : ""}`;
  const inputId = `preview-${field.id}`;
  const help = field.helpText ? <p className="is_Text font_body tm-paragraph _ff-163417665 _us-601593343 _ws-974065937 _c-1338521736 _fs-1892529859 _lh-95508644"  >{field.helpText}</p> : null;

  if (field.type === "GUEST" || field.type === "CHECKBOX") return (
    <div className="is_View _f-2057920087 _g-924523017">
      <div className="is_View _f-1841970073 _mh-1325713000 _ai-1055227096 _g-924523048 _p-788534843 _b-859026412 _br-1889339871"      >
        <Checkbox id={inputId} size="sm" disabled />
        <Label htmlFor={inputId} flex={1} fontSize="3" fontWeight="700">{label}</Label>
      </div>
      {field.type === "GUEST" ? <p className="is_Text font_body tm-paragraph _ff-163417665 _us-601593343 _ws-974065937 _c-1338521736 _fs-1892529859 _lh-95508644"  >Selecting this reveals the guest name and age-status questions.</p> : help}
    </div>
  );

  if (field.type === "TEXTAREA") return (
    <div className="is_View _f-2057920087 _g-924523017"><Label htmlFor={inputId} fontSize="3" fontWeight="700">{label}</Label><TextArea id={inputId} disabled height={112} placeholder="Your answer" />{help}</div>
  );

  if (field.type === "SELECT") return (
    <div className="is_View _f-2057920087 _g-924523017"><Label fontSize="3" fontWeight="700">{label}</Label><OperationSelect value="" onValueChange={() => undefined} options={field.options.map((option) => ({ label: option, value: option }))} label={field.label} disabled placeholder="Choose an option" />{help}</div>
  );

  if (field.type === "MULTISELECT") return (
    <div className="is_View _f-2057920087 _g-924523017">
      <span className="is_Text _c-1996280471 _fs-1892529890 _fw-291938664" >{label}</span>
      <div className="is_View _f-2057920087 _g-924523017">{field.options.map((option, index) => <div key={`${option}:${index}`} className="is_View _f-1841970073 _mh-1325688975 _ai-1055227096 _g-924523048 _p-788534843 _b-859026412 _br-1889339871"      ><Checkbox size="sm" disabled /><span className="is_Text _c-1996280471 _fs-1892529890">{option}</span></div>)}</div>
      {help}
    </div>
  );

  return <div className="is_View _f-2057920087 _g-924523017"><Label htmlFor={inputId} fontSize="3" fontWeight="700">{label}</Label><Input id={inputId} disabled placeholder={field.mapping === "EMAIL" ? "name@company.com" : "Your answer"} />{help}</div>;
}

function QuestionActions({ index, isFirst, isLast, onMove, onDelete }: { index: number; isFirst: boolean; isLast: boolean; onMove: (direction: -1 | 1) => void; onDelete: () => void }) {
  return (
    <Menu placement="bottom-end" offset={6}>
      <Menu.Trigger asChild>
        <TamaguiButton size="md" circular variant="quiet" aria-label={`Question ${index + 1} actions`} icon={MoreHorizontal} />
      </Menu.Trigger>
      <Menu.Portal zIndex={125_000}>
        <Menu.Content className="ep-nav-displacing-overlay" minWidth={210} padding="1" borderWidth={1} borderColor="border-color" borderRadius="4" backgroundColor="background" boxShadow="0 18px 45px rgba(2, 20, 12, 0.18)" transition="quick" opacity="enter:0 exit:0" scale="enter:0.96 exit:0.98" y="enter:-5px exit:-3px">
          <Menu.Arrow size={12} borderWidth={1} borderColor="border-color" />
          <Menu.Sub>
            <Menu.SubTrigger className="ep-action-menu-item" key={`move:${index}`} textValue="Move question">
              <Menu.ItemTitle>Move question</Menu.ItemTitle>
              <ChevronRight size={15} />
            </Menu.SubTrigger>
            <Menu.Portal zIndex={126_000}>
              <Menu.SubContent className="ep-nav-displacing-overlay" minWidth={180} padding="1" borderWidth={1} borderColor="border-color" borderRadius="4" backgroundColor="background" boxShadow="0 18px 45px rgba(2, 20, 12, 0.18)" transition="quick" opacity="enter:0 exit:0" scale="enter:0.96 exit:0.98" x="enter:-5px exit:-3px">
                <Menu.Item className="ep-action-menu-item" key={`up:${index}`} textValue="Move up" disabled={isFirst} onSelect={() => onMove(-1)}>
                  <Menu.ItemTitle>Move up</Menu.ItemTitle><ArrowUp size={15} />
                </Menu.Item>
                <Menu.Item className="ep-action-menu-item" key={`down:${index}`} textValue="Move down" disabled={isLast} onSelect={() => onMove(1)}>
                  <Menu.ItemTitle>Move down</Menu.ItemTitle><ArrowDown size={15} />
                </Menu.Item>
              </Menu.SubContent>
            </Menu.Portal>
          </Menu.Sub>
          <Menu.Separator className="ep-action-menu-separator" />
          <Menu.Item className="ep-action-menu-item" destructive key={`delete:${index}`} textValue="Delete question" onSelect={onDelete}>
            <Menu.ItemTitle color="alert-700">Delete question</Menu.ItemTitle><Trash2 size={15} />
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  );
}

export function RegistrationFormBuilder() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState("");
  const [fields, setFields] = useState<RegistrationField[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  useEffect(() => {
    void fetch("/api/events", { cache: "no-store" }).then((response) => response.json()).then((data) => {
      const next = (data.events ?? []) as EventSummary[];
      const requestedEventId = new URLSearchParams(window.location.search).get("eventId");
      const resolvedEventId = requestedEventId && next.some((event) => event.id === requestedEventId)
        ? requestedEventId
        : next[0]?.id ?? "";
      setEvents(next);
      setEventId(resolvedEventId);
    });
  }, []);

  useEffect(() => {
    if (!eventId) return;
    void fetch(`/api/events/${eventId}/registration-fields`, { cache: "no-store" }).then((response) => response.json()).then((data) => setFields(data.fields ?? []));
  }, [eventId]);

  function update(index: number, patch: Partial<RegistrationField>) {
    setFields((current) => current.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...patch } : field));
  }

  function move(index: number, direction: -1 | 1) {
    setFields((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addPreset(presetIndex: number) {
    const preset = registrationFieldPresets[presetIndex];
    if (preset.field.mapping && fields.some((field) => field.mapping === preset.field.mapping)) {
      setMessage(`${preset.name} is already part of this form.`);
      return;
    }
    setFields((current) => [...current, { ...preset.field, id: fieldId(preset.name.toLocaleLowerCase().replaceAll(" ", "_")), options: [...preset.field.options] }]);
    setMessage(`${preset.name} added. Customize it below before saving.`);
  }

  function updateOption(fieldIndex: number, optionIndex: number, value: string) {
    const options = [...fields[fieldIndex].options];
    options[optionIndex] = value;
    update(fieldIndex, { options });
  }

  function addOption(fieldIndex: number) {
    const options = fields[fieldIndex].options;
    update(fieldIndex, { options: [...options, `Option ${options.length + 1}`] });
  }

  function removeOption(fieldIndex: number, optionIndex: number) {
    update(fieldIndex, { options: fields[fieldIndex].options.filter((_, index) => index !== optionIndex) });
  }

  async function save() {
    const normalized = fields.map((field) => ({ ...field, label: field.label.trim(), helpText: field.helpText.trim(), options: field.options.map((option) => option.trim()).filter(Boolean) }));
    if (selectedEvent?.waitlistEnabled && !normalized.some((field) => field.mapping === "EMAIL")) {
      setMessage("Waitlist events need the Email preset so promoted attendees can receive their pass.");
      return;
    }
    const invalidChoice = normalized.find((field) => ["SELECT", "MULTISELECT"].includes(field.type) && (field.options.length < 2 || new Set(field.options.map((option) => option.toLocaleLowerCase())).size !== field.options.length));
    if (invalidChoice) {
      setMessage(`${invalidChoice.label || "Choice field"} needs at least two different options.`);
      return;
    }
    setSaving(true);
    setMessage("");
    const response = await fetch(`/api/events/${eventId}/registration-fields`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: normalized }) });
    const data = await response.json();
    setSaving(false);
    if (response.ok) setFields(data.fields);
    setMessage(response.ok ? "Registration form saved. New submissions will use this version." : data.error ?? "Could not save the form.");
  }

  const selectedEvent = events.find((event) => event.id === eventId);

  return (
    <>
      <div className="ep-registration-workspace">
        <aside className="ep-registration-rail" aria-label="Registration question presets">
          <section className="ep-rail-section">
            <div className="ep-section-heading">
              <h2>Quick-add fields</h2>
              <p>Choose a preset or add a question.</p>
            </div>
            <div className="ep-registration-baseline">
              <span aria-hidden="true" className="ep-baseline-dot" />
              Every form starts with name and attendee age status. Guest details and every other question are optional add-ons. Attendees submit once; later changes stay with authorized staff.
            </div>
            {selectedEvent?.waitlistEnabled && !fields.some((field) => field.mapping === "EMAIL") ? <p className="ep-inline-guidance">This event uses a waitlist. Add the Email preset so promoted attendees can receive their pass.</p> : null}
            <div className="ep-preset-list">
              {registrationFieldPresets.map((preset, index) => {
                const alreadyAdded = Boolean(preset.field.mapping && fields.some((field) => field.mapping === preset.field.mapping));
                return <TamaguiButton key={preset.name} disabled={alreadyAdded} onPress={() => addPreset(index)} className="ep-preset-button" variant="quiet"><div className="is_View _f-2057920087 ep-preset-copy"><span className="is_Text _c-1996280471 ep-preset-title">{preset.name}</span><span className="is_Text _c-1996280471 ep-preset-detail">{alreadyAdded ? "Already added" : preset.description}</span></div><Plus size={16} aria-hidden="true" /></TamaguiButton>;
              })}
            </div>
          </section>
        </aside>
        <section className="ep-form-composer">
          <header className="ep-composer-header">
            <div className="ep-section-heading">
              <div className="ep-composer-title-line"><h2>Registration questions</h2><span className="ep-count-badge">{fields.length} custom</span></div>
              <p>Shown after name and age.</p>
            </div>
            <div className="ep-composer-actions"><Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}><Eye size={16} /> Preview</Button><Button type="button" variant="secondary" onClick={() => setFields((current) => [...current, newField()])}><Plus size={16} /> Add question</Button></div>
          </header>
          <div className="ep-question-list">
            {fields.length === 0 ? <div className="ep-operation-empty"><strong>No custom questions.</strong><span>Name and age are already included.</span></div> : null}
            {fields.map((field, index) => (
              <article key={field.id} className="ep-question-row">
                <div className="ep-question-index" aria-label={`Question ${index + 1}`}>{String(index + 1).padStart(2, "0")}</div>
                <div className="ep-question-body">
                  <div className="ep-question-primary">
                  <Input value={field.label} aria-label="Question label" onChange={(event) => update(index, { label: event.target.value })} />
                  <OperationSelect value={field.type} onValueChange={(value) => update(index, { type: value as RegistrationField["type"], options: ["SELECT", "MULTISELECT"].includes(value) && field.options.length < 2 ? ["Option one", "Option two"] : field.options })} compact label="Question type" options={([ ["TEXT", "Short text"], ["TEXTAREA", "Long text"], ["SELECT", "One choice"], ["MULTISELECT", "Multiple choices"], ["CHECKBOX", "Confirmation"], ...(field.mapping === "GUEST" ? [["GUEST", "Guest add-on"]] : []) ] as [RegistrationField["type"], string][]).map(([value, label]) => ({ value, label, disabled: !typeAllowed(field, value) }))} />
                  <div className="ep-question-controls"><QuestionActions index={index} isFirst={index === 0} isLast={index === fields.length - 1} onMove={(direction) => move(index, direction)} onDelete={() => setDeleteIndex(index)} /></div>
                  </div>
                  {field.mapping ? <p className="ep-field-connection">Connected to attendee {field.mapping.toLocaleLowerCase().replaceAll("_", " ")}</p> : null}
                  <Input value={field.helpText} aria-label="Help text" placeholder="Optional help text" onChange={(event) => update(index, { helpText: event.target.value })} />
                {(field.type === "SELECT" || field.type === "MULTISELECT") ? (
                  <fieldset className="ep-choice-editor"><legend>Choices</legend>{field.options.map((option, optionIndex) => <div key={`${field.id}:option:${optionIndex}`} className="ep-choice-row"><Input value={option} aria-label={`${field.label} option ${optionIndex + 1}`} onChange={(event) => updateOption(index, optionIndex, event.target.value)} placeholder={`Option ${optionIndex + 1}`} /><Button type="button" variant="ghost" aria-label={`Remove option ${optionIndex + 1}`} disabled={field.options.length <= 2} onClick={() => removeOption(index, optionIndex)}><Trash2 size={16} /></Button></div>)}<Button type="button" variant="ghost" className="ep-add-option" onClick={() => addOption(index)}><Plus size={16} /> Add option</Button><p>Each choice has its own field, so spaces and commas are preserved.</p></fieldset>
                ) : null}
                  {field.type !== "GUEST" ? <div className="is_View _f-1841970073 _ai-1055227096 _g-924523017 ep-required-toggle"  ><Checkbox id={`required:${field.id}`} size="sm" checked={field.required} onCheckedChange={(checked) => update(index, { required: checked === true })}><Checkbox.Indicator><Check size={13} /></Checkbox.Indicator></Checkbox><Label htmlFor={`required:${field.id}`} fontSize="3" fontWeight="700">Required response</Label></div> : null}
                </div>
              </article>
            ))}
          </div>
          {message ? <p className="ep-operation-notice" role="status">{message}</p> : null}
          <footer className="ep-composer-footer"><span>Changes only affect new registrations.</span><Button type="button" disabled={!eventId} loading={saving} loadingLabel="Saving form…" onClick={() => void save()}><Save size={16} /> Save form</Button></footer>
        </section>
      </div>
      <PreviewSheet open={previewOpen} onOpenChange={setPreviewOpen} title={selectedEvent ? `${selectedEvent.name} registration` : "Registration preview"} description="Fields are disabled in preview.">
        <div className="is_View _f-2057920087 _g-924523110">
          <div className="is_View _f-2057920087 _g-924523110 _p-1370393695 _b-859026412 _br-1889339902 _b-803444677"     >
            <div className="is_View _f-1841970073 _ai-607522671 _jc-509505936 _g-924523079 ep-preview-summary"   >
              <div className="is_View _f-549969169 _mw-839999524 _w-1646821508 _g-924522986"   >
                <span className="is_Text _c-1996280471 _fs-1892529952 _fw-291939625" >Attendee details</span>
                <p className="is_Text font_body tm-paragraph _ff-163417665 _us-601593343 _ws-974065937 _c-1338521736 _fs-1892529890 _lh-95508613"  >The required identity fields appear first on every registration.</p>
              </div>
              <span className="is_Text _p-1659892846 _br-1560008768 _b-347950030 _c-674909176 _fs-1892529859 _fw-291939625"      >2 required fields</span>
            </div>
            <div className="is_View _f-1841970073 ep-preview-grid">
              <div className="is_View _f-549969169 _mw-839999524 _g-924523017"  ><Label htmlFor="preview-first-name" fontSize="3" fontWeight="700">First name</Label><Input id="preview-first-name" disabled placeholder="First name" /></div>
              <div className="is_View _f-549969169 _mw-839999524 _g-924523017"  ><Label htmlFor="preview-last-name" fontSize="3" fontWeight="700">Last name</Label><Input id="preview-last-name" disabled placeholder="Last name" /></div>
            </div>
            <div className="is_View _f-2057920087 _g-924523017">
              <span className="is_Text _c-1996280471 _fs-1892529890 _fw-291938664" >Are you 21 or older?</span>
              <div className="is_View _f-1841970073 ep-preview-grid">
                <div className="is_View _f-1872995505 _mh-1325713000 _ai-1055227096 _jc-166379546 _p-788534843 _b-859026412 _br-1889339871"       ><span className="is_Text _c-1996280471 _fs-1892529890 _fw-291938664" >Yes, 21+</span></div>
                <div className="is_View _f-1872995505 _mh-1325713000 _ai-1055227096 _jc-166379546 _p-788534843 _b-859026412 _br-1889339871"       ><span className="is_Text _c-1996280471 _fs-1892529890 _fw-291938664" >No, under 21</span></div>
              </div>
            </div>
          </div>

          {fields.length ? <div className="is_View _f-2057920087 _g-924523110 _p-1370393695 _b-859026412 _br-1889339902 _b-803444677"     ><div className="is_View _f-2057920087 _g-924522986"><span className="is_Text _c-1996280471 _fs-1892529952 _fw-291939625" >Event questions</span><p className="is_Text font_body tm-paragraph _ff-163417665 _us-601593343 _ws-974065937 _c-1338521736 _fs-1892529890 _lh-95508613"  >Custom questions appear in the same order attendees will see them.</p></div>{fields.map((field) => <PreviewQuestion key={field.id} field={field} />)}</div> : null}

          <div className="is_View _f-2057920087 _g-924523017">
            <Button type="button" disabled className="w-full">Register and generate pass</Button>
            <p className="is_Text font_body tm-paragraph _ff-163417665 _us-601593343 _ws-974065937 _lh-1535282283 _ta-972680809 _c-1338521736 _fs-1892529859"  >Preview mode keeps every field and action inactive.</p>
          </div>
        </div>
      </PreviewSheet>
      <ConfirmDialog open={deleteIndex !== null} onOpenChange={(open) => { if (!open) setDeleteIndex(null); }} title="Delete this question?" description={deleteIndex === null ? "This question will be removed from the form." : `“${fields[deleteIndex]?.label || "This question"}” will be removed from the form. Save the form to publish the change.`} confirmLabel="Delete question" destructive onConfirm={() => { if (deleteIndex !== null) setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== deleteIndex)); setDeleteIndex(null); }} />
    </>
  );
}
