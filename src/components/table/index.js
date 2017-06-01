import React from 'react'
import Table from 'react-virtualized/dist/commonjs/Table/Table'
import Column from 'react-virtualized/dist/commonjs/Table/Column'
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer'

require('react-virtualized/styles.css')

const rowHeight = 30

class TableView extends React.Component {
  shouldComponentUpdate (nextProps) {
    return nextProps.filteredFeatures !== this.props.filteredFeatures
  }

  getColumns () {
    const { filteredFeatures } = this.props
    const featureWithProperties = filteredFeatures.find(d => d.hasOwnProperty('properties'))
    if (!featureWithProperties) { return false }
    return Object.keys(featureWithProperties.properties)
  }

  render () {
    const { filteredFeatures } = this.props
    const rowGetter = ({ index }) => filteredFeatures[index].properties
    const columns = this.getColumns()
    return (
      <div style={{width: '100%', height: '100%', position: 'absolute'}}>
        <AutoSizer>
          {({ width, height }) => (
            <Table
              disableHeader={false}
              ref='table'
              headerHeight={rowHeight}
              height={height}
              rowCount={filteredFeatures.length}
              rowGetter={rowGetter}
              rowHeight={rowHeight}
              width={width}
            >
              {columns.map(column => (
                <Column
                  label={column}
                  key={column}
                  dataKey={column}
                  width={1}
                  flexGrow={1}
                />
              ))}
            </Table>
          )}
        </AutoSizer>
      </div>
    )
  }
}

export default TableView
