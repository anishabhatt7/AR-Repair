export const DEMO_REPAIRS = {
  printer: {
    name: 'Printer - Paper Jam',
    difficulty: 'easy',
    estimated_time: '5 minutes',
    tools_needed: [],
    repair_steps: [
      {
        step_number: 1,
        instruction: 'Open the front access door by pulling the panel toward you',
        annotations: [
          { type: 'box', x: 0.25, y: 0.35, width: 0.5, height: 0.2, color: 'white', label: 'Front panel' },
          { type: 'arrow', x: 0.5, y: 0.55, target_x: 0.5, target_y: 0.45, color: 'white', label: 'Pull toward you' }
        ]
      },
      {
        step_number: 2,
        instruction: 'Gently pull out the jammed paper with both hands',
        annotations: [
          { type: 'box', x: 0.3, y: 0.3, width: 0.4, height: 0.18, color: 'white', label: 'Paper path' },
          { type: 'arrow', x: 0.5, y: 0.42, target_x: 0.5, target_y: 0.3, color: 'white', label: 'Pull out slowly' }
        ]
      },
      {
        step_number: 3,
        instruction: 'Close the door and press the power button',
        annotations: [
          { type: 'circle', x: 0.75, y: 0.2, radius: 0.035, color: 'white', label: 'Power button' },
          { type: 'checkmark', x: 0.5, y: 0.4, radius: 0.05, color: 'green' }
        ]
      }
    ]
  },
  router: {
    name: 'Router - No Internet',
    difficulty: 'easy',
    estimated_time: '3 minutes',
    tools_needed: [],
    repair_steps: [
      {
        step_number: 1,
        instruction: 'Unplug the power cable from the back',
        annotations: [
          { type: 'circle', x: 0.7, y: 0.4, radius: 0.04, color: 'white', label: 'Power port' },
          { type: 'arrow', x: 0.7, y: 0.4, target_x: 0.82, target_y: 0.4, color: 'white', label: 'Pull out' }
        ]
      },
      {
        step_number: 2,
        instruction: 'Wait 30 seconds for memory to clear',
        annotations: [
          { type: 'box', x: 0.3, y: 0.3, width: 0.4, height: 0.2, color: 'white', label: 'Wait 30 seconds' }
        ]
      },
      {
        step_number: 3,
        instruction: 'Verify the WAN cable is in the blue port',
        annotations: [
          { type: 'circle', x: 0.5, y: 0.4, radius: 0.04, color: 'blue', label: 'WAN port (blue)' },
          { type: 'box', x: 0.4, y: 0.32, width: 0.2, height: 0.16, color: 'white', label: 'Check cable' }
        ]
      },
      {
        step_number: 4,
        instruction: 'Plug the power cable back in',
        annotations: [
          { type: 'circle', x: 0.7, y: 0.4, radius: 0.04, color: 'white', label: 'Power port' },
          { type: 'arrow', x: 0.82, y: 0.4, target_x: 0.7, target_y: 0.4, color: 'white', label: 'Plug in' }
        ]
      },
      {
        step_number: 5,
        instruction: 'Wait for the internet light to turn green',
        annotations: [
          { type: 'circle', x: 0.35, y: 0.25, radius: 0.025, color: 'green', label: 'Internet LED' },
          { type: 'checkmark', x: 0.5, y: 0.4, radius: 0.05, color: 'green' }
        ]
      }
    ]
  },
  laptop: {
    name: 'PC - Replace Hard Drive',
    difficulty: 'moderate',
    estimated_time: '15 minutes',
    tools_needed: ['Phillips screwdriver'],
    repair_steps: [
      {
        step_number: 1,
        instruction: 'Disconnect the SATA cables from the drive',
        annotations: [
          { type: 'box', x: 0.35, y: 0.3, width: 0.3, height: 0.15, color: 'white', label: 'Hard drive' },
          { type: 'circle', x: 0.66, y: 0.37, radius: 0.03, color: 'white', label: 'SATA cable' },
          { type: 'arrow', x: 0.66, y: 0.37, target_x: 0.75, target_y: 0.37, color: 'white', label: 'Pull gently' }
        ]
      },
      {
        step_number: 2,
        instruction: 'Press the release tabs and slide the drive out',
        annotations: [
          { type: 'box', x: 0.35, y: 0.3, width: 0.3, height: 0.15, color: 'white', label: 'Drive bay' },
          { type: 'circle', x: 0.34, y: 0.35, radius: 0.02, color: 'green', label: 'Release tab' },
          { type: 'circle', x: 0.34, y: 0.42, radius: 0.02, color: 'green', label: 'Release tab' },
          { type: 'arrow', x: 0.5, y: 0.38, target_x: 0.5, target_y: 0.28, color: 'white', label: 'Slide up' }
        ]
      },
      {
        step_number: 3,
        instruction: 'Slide the new drive in until it clicks',
        annotations: [
          { type: 'box', x: 0.35, y: 0.28, width: 0.3, height: 0.17, color: 'white', label: 'Empty bay' },
          { type: 'arrow', x: 0.5, y: 0.25, target_x: 0.5, target_y: 0.38, color: 'white', label: 'Slide in' }
        ]
      },
      {
        step_number: 4,
        instruction: 'Reconnect both SATA cables firmly',
        annotations: [
          { type: 'circle', x: 0.66, y: 0.37, radius: 0.03, color: 'white', label: 'Data cable' },
          { type: 'circle', x: 0.66, y: 0.42, radius: 0.03, color: 'white', label: 'Power cable' },
          { type: 'checkmark', x: 0.5, y: 0.35, radius: 0.05, color: 'green' }
        ]
      }
    ]
  },
  appliance: {
    name: 'Keurig - Not Brewing',
    difficulty: 'easy',
    estimated_time: '10 minutes',
    tools_needed: ['Paperclip'],
    repair_steps: [
      {
        step_number: 1,
        instruction: 'Unplug the machine and let it cool down',
        annotations: [
          { type: 'circle', x: 0.75, y: 0.45, radius: 0.04, color: 'white', label: 'Power plug' },
          { type: 'arrow', x: 0.75, y: 0.45, target_x: 0.85, target_y: 0.45, color: 'white', label: 'Unplug' }
        ]
      },
      {
        step_number: 2,
        instruction: 'Lift the handle and locate the needle inside',
        annotations: [
          { type: 'box', x: 0.3, y: 0.15, width: 0.4, height: 0.15, color: 'white', label: 'Lift handle up' },
          { type: 'circle', x: 0.5, y: 0.35, radius: 0.03, color: 'white', label: 'Needle here' }
        ]
      },
      {
        step_number: 3,
        instruction: 'Insert a paperclip into the needle hole to clear it',
        annotations: [
          { type: 'circle', x: 0.5, y: 0.35, radius: 0.04, color: 'white', label: 'Needle opening' },
          { type: 'arrow', x: 0.5, y: 0.25, target_x: 0.5, target_y: 0.34, color: 'white', label: 'Insert clip' }
        ]
      },
      {
        step_number: 4,
        instruction: 'Run an empty brew cycle to flush',
        annotations: [
          { type: 'circle', x: 0.55, y: 0.4, radius: 0.04, color: 'white', label: 'Brew button' },
          { type: 'checkmark', x: 0.5, y: 0.35, radius: 0.06, color: 'green' }
        ]
      }
    ]
  },
  phone: {
    name: 'Phone - Replace Screen',
    difficulty: 'advanced',
    estimated_time: '45 minutes',
    tools_needed: ['Suction cup', 'Pentalobe screwdriver', 'Spudger'],
    repair_steps: [
      {
        step_number: 1,
        instruction: 'Remove the two screws at the bottom edge',
        annotations: [
          { type: 'circle', x: 0.45, y: 0.6, radius: 0.02, color: 'white', label: 'Screw' },
          { type: 'circle', x: 0.55, y: 0.6, radius: 0.02, color: 'white', label: 'Screw' }
        ]
      },
      {
        step_number: 2,
        instruction: 'Apply suction cup and pull the screen up gently',
        annotations: [
          { type: 'circle', x: 0.5, y: 0.5, radius: 0.07, color: 'white', label: 'Place suction cup' },
          { type: 'arrow', x: 0.5, y: 0.5, target_x: 0.5, target_y: 0.38, color: 'white', label: 'Pull up gently' }
        ]
      },
      {
        step_number: 3,
        instruction: 'Slide a spudger along the edge to release clips',
        annotations: [
          { type: 'box', x: 0.3, y: 0.25, width: 0.4, height: 0.4, color: 'white', label: 'Screen edge' },
          { type: 'arrow', x: 0.3, y: 0.45, target_x: 0.3, target_y: 0.3, color: 'white', label: 'Slide along edge' }
        ]
      },
      {
        step_number: 4,
        instruction: 'Disconnect the display ribbon cable',
        annotations: [
          { type: 'circle', x: 0.5, y: 0.3, radius: 0.035, color: 'white', label: 'Ribbon connector' },
          { type: 'arrow', x: 0.5, y: 0.3, target_x: 0.5, target_y: 0.23, color: 'white', label: 'Flip up' }
        ]
      },
      {
        step_number: 5,
        instruction: 'Connect new screen and snap case shut',
        annotations: [
          { type: 'box', x: 0.3, y: 0.25, width: 0.4, height: 0.4, color: 'white', label: 'New screen' },
          { type: 'checkmark', x: 0.5, y: 0.4, radius: 0.06, color: 'green' }
        ]
      }
    ]
  },
  other: {
    name: 'General Troubleshooting',
    difficulty: 'easy',
    estimated_time: '5 minutes',
    tools_needed: [],
    repair_steps: [
      {
        step_number: 1,
        instruction: 'Turn off the device and unplug it',
        annotations: [
          { type: 'circle', x: 0.5, y: 0.35, radius: 0.05, color: 'white', label: 'Power off' }
        ]
      },
      {
        step_number: 2,
        instruction: 'Check all cables and connections',
        annotations: [
          { type: 'box', x: 0.3, y: 0.3, width: 0.4, height: 0.2, color: 'white', label: 'Check connections' }
        ]
      },
      {
        step_number: 3,
        instruction: 'Power on and test again',
        annotations: [
          { type: 'circle', x: 0.5, y: 0.35, radius: 0.05, color: 'white', label: 'Power on' },
          { type: 'checkmark', x: 0.5, y: 0.35, radius: 0.06, color: 'green' }
        ]
      }
    ]
  }
};
