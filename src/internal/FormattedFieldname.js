// @flow
import * as React from 'react'
import { useIntl } from 'react-intl'

import { getFieldLabel } from '../utils/strings'
import type { Field } from '../types'

const styles = {
  groupText: {
    fontSize: '0.875em',
    color: 'rgba(0, 0, 0, 0.541176)'
  }
}

type Props = {
  field: Field
}

/** Formats a field name nicely */
const FormattedFieldname = ({ field }: Props) => {
  const intl = useIntl()
  const label = getFieldLabel(field, intl)
  if (typeof label === 'string') {
    return <span title={label}>{label}</span>
  } else {
    const groupText = label.slice(0, label.length - 1).join(' / ') + ' / '
    const fieldText = label[label.length - 1]
    return (
      <span title={groupText + fieldText}>
        <span style={styles.groupText}>{groupText}</span>
        <span>{fieldText}</span>
      </span>
    )
  }
}

export default FormattedFieldname
