const React = require('react')
const { PropTypes } = React
const shouldPureComponentUpdate = require('react-pure-render/function')
const makePure = require('recompose/pure').default
const Checkbox = makePure(require('material-ui/Checkbox').default)
const ListIcon = require('material-ui/svg-icons/action/list').default
const {ListItem} = require('material-ui/List')
const omit = require('lodash/omit')

const ShowAllButton = require('./show_all_button')
const OnlyButton = require('./only_button')
const { t, titleCase } = require('../util/text_helpers')
const { listStyles } = require('../styles')

const styles = {
  checkbox: {
    marginBottom: 8,
    fontSize: 14
  },
  checkboxLabel: {
    lineHeight: '22px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  checkboxIcon: {
    width: 20,
    height: 20,
    marginRight: 14
  }
}

// Material-ui passes a `nestedLevel` prop to nested items.
// We're not using a `div` instead of the material-ui component for
// nested items, so we need to remove the `nestedLevel` prop.
const NestedItem = props => {
  const divProps = omit(props, ['nestedLevel', 'children'])
  return <div {...divProps}>{props.children}</div>
}

class DiscreteFilter extends React.Component {
  static propTypes = {
    fieldName: PropTypes.string.isRequired,
    checked: PropTypes.array,
    values: PropTypes.objectOf(PropTypes.number),
    onUpdate: PropTypes.func
  }

  static defaultProps = {
    checked: [],
    onUpdate: (x) => x
  }

  state = {}

  shouldComponentUpdate = shouldPureComponentUpdate

  showAll = (e) => {
    e.preventDefault()
    this.props.onUpdate({
      exp: 'in',
      key: this.props.fieldName,
      val: null
    })
  }

  handleCheck = (e) => {
    const v = e.target.value
    const checked = this.props.checked.slice(0)
    if (e.target.checked && checked.indexOf(v) === -1) {
      checked.push(v)
    } else if (!e.target.checked && checked.indexOf(v) > -1) {
      checked.splice(checked.indexOf(v), 1)
    }
    this.props.onUpdate({
      exp: 'in',
      key: this.props.fieldName,
      val: checked
    })
  }

  handleOnlyClick (key, e) {
    e.preventDefault()
    this.props.onUpdate({
      exp: 'in',
      key: this.props.fieldName,
      val: [key]
    })
  }

  handleMouseEnter (key) {
    this.setState({hovered: key})
  }

  handleMouseLeave = () => {
    this.setState({hovered: false})
  }

  render () {
    const {fieldName, checked, values} = this.props
    const isFiltered = checked.length < Object.keys(values).length
    return (
      <ListItem
        innerDivStyle={listStyles.listItemInner}
        primaryText={titleCase(fieldName)}
        leftIcon={<ListIcon style={listStyles.listIcon} />}
        initiallyOpen
        disabled
        rightIconButton={isFiltered ? <ShowAllButton onClick={this.showAll} /> : null}
        nestedListStyle={listStyles.nestedList}
        nestedItems={Object.keys(values).map((v) => (
          <NestedItem
            key={v}
            style={{position: 'relative'}}
            onMouseEnter={this.handleMouseEnter.bind(this, v)}
            onMouseLeave={this.handleMouseLeave}>
            <Checkbox
              label={t(v)}
              value={v}
              style={styles.checkbox}
              iconStyle={styles.checkboxIcon}
              labelStyle={styles.checkboxLabel}
              checked={checked.indexOf(v) > -1}
              onCheck={this.handleCheck}
              disableFocusRipple
              disableTouchRipple />
            {this.state.hovered === v &&
              <OnlyButton
                onClick={this.handleOnlyClick.bind(this, v)} />}
          </NestedItem>
        ))}
      />
    )
  }
}

module.exports = DiscreteFilter
