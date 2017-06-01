import React from 'react'
import Table from 'react-virtualized/dist/commonjs/Table/Table'
import Column from 'react-virtualized/dist/commonjs/Table/Column'
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer'

const rowHeight = 30

class TableView extends React.Component {
  render () {
    console.log(this.props)
    const { features } = this.props
    const rowGetter = ({ index }) => features[index].properties
    return (
      <div style={{width: '100%', height: '100%', position: 'absolute'}}>
        <AutoSizer>
          {({ width, height }) => (
            <Table
              ref='table'
              headerHeight={rowHeight}
              height={height}
              rowCount={features.length}
              rowGetter={rowGetter}
              rowHeight={rowHeight}
              width={width}
            >
              <Column
                dataKey='area'
                width={90}
              />
            </Table>
          )}
        </AutoSizer>
      </div>
    )
  }
}

export default TableView
