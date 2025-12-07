import { setProjectAnnotations } from '@storybook/react-vite'
import * as projectAnnotations from './preview'

// Apply Storybook configuration when testing stories
setProjectAnnotations([projectAnnotations])
