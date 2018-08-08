import React from 'react'

import { storiesOf } from '@storybook/react'
// import { action } from '@storybook/addon-actions'
// import { linkTo } from '@storybook/addon-links'
import insertCss from 'insert-css'

import ReportView from './ReportView'

insertCss(`
  body {
    margin: 0px;
  }
  .wrapper {
    width: calc(100% - 60px);
    height: calc(100% - 60px);
    margin: 20px;
    position: absolute;
    border: 1px dotted red;
  }
  @media only print {
    .wrapper {
      width: auto;
      height; auto;
      position: static;
      margin: 0;
      border: none;
    }
  }
`)

storiesOf('ReportView', module)
  .addDecorator(story => <div className="wrapper">{story()}</div>)
  .add('default', () => (
    <ReportView
      renderTest
      features={Array(50)
        .fill(null)
        .map((v, i) => ({ id: i, height: 200 + Math.random() * 200 }))}
    />
  ))
