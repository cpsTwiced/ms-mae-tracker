import { Group, NumberInput, Select, TextInput } from '@mantine/core'
import { JOB_GROUPS } from './jobs'
import { SERVER_GROUPS } from './servers'

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
        value={values.name}
        onChange={(e) => onChange({ name: e.currentTarget.value })}
      />
      <Group grow align="flex-start" mt="xs">
        <NumberInput
          label="Level"
          // Hide the steppers so the field can use the app default radius ('lg')
          // and match the Name/Job/Server inputs — the large rounded corner
          // otherwise clips the increment/decrement buttons.
          hideControls
          min={1}
          max={300}
          clampBehavior="strict"
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
