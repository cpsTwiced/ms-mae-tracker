import { Group, NumberInput, Select, TextInput } from '@mantine/core'
import { JOB_GROUPS } from '@/data/jobs'
import { SERVER_GROUPS } from '@/data/servers'
import { MAX_NAME_LENGTH } from '@/lib/storage'

// Name / level / job / server inputs, controlled by the parent.
// `onChange` receives a partial patch, e.g. { level: 200 }.
export default function CharacterFields({
  values,
  onChange,
  namePlaceholder = 'Character name',
}) {
  return (
    <>
      <TextInput
        label="Name"
        placeholder={namePlaceholder}
        maxLength={MAX_NAME_LENGTH}
        value={values.name}
        onChange={(e) =>
          onChange({ name: e.currentTarget.value.slice(0, MAX_NAME_LENGTH) })
        }
      />
      <Group grow align="flex-start" mt="xs">
        <NumberInput
          label="Level"
          // Hide the steppers so the field matches the Name/Job/Server inputs
          // — the rounded corner otherwise clips the increment/decrement
          // buttons.
          hideControls
          min={1}
          max={300}
          // "blur" clamps the committed value (typing "999" lands on 300);
          // "strict" would reject the third keystroke and strand the field
          // at 99.
          clampBehavior="blur"
          allowDecimal={false}
          value={values.level}
          onChange={(val) =>
            onChange({ level: typeof val === 'number' ? val : '' })
          }
        />
        <Select
          label="Job"
          placeholder="Search job"
          searchable
          clearable
          nothingFoundMessage="No match"
          data={JOB_GROUPS}
          value={values.job || null}
          onChange={(val) => onChange({ job: val ?? '' })}
        />
        <Select
          label="Server"
          placeholder="Pick server"
          clearable
          data={SERVER_GROUPS}
          value={values.server || null}
          onChange={(val) => onChange({ server: val ?? '' })}
        />
      </Group>
    </>
  )
}
