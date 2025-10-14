import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShareBanner } from './share-banner'

// Mock functions
const mockOnClose = jest.fn()
const mockOnShare = jest.fn()
const mockOnShareWhatsApp = jest.fn()
const mockOnShareLinkedIn = jest.fn()
const mockOnShareEmail = jest.fn()

describe('ShareBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders when visible', () => {
    render(
      <ShareBanner
        isVisible={true}
        onClose={mockOnClose}
        onShare={mockOnShare}
        onShareWhatsApp={mockOnShareWhatsApp}
        onShareLinkedIn={mockOnShareLinkedIn}
        onShareEmail={mockOnShareEmail}
      />
    )

    expect(screen.getByText('Share with your peers')).toBeInTheDocument()
    expect(screen.getByText('WhatsApp')).toBeInTheDocument()
    expect(screen.getByText('LinkedIn')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('does not render when not visible', () => {
    render(
      <ShareBanner
        isVisible={false}
        onClose={mockOnClose}
        onShare={mockOnShare}
        onShareWhatsApp={mockOnShareWhatsApp}
        onShareLinkedIn={mockOnShareLinkedIn}
        onShareEmail={mockOnShareEmail}
      />
    )

    expect(screen.queryByText('Share with your peers')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <ShareBanner
        isVisible={true}
        onClose={mockOnClose}
        onShare={mockOnShare}
        onShareWhatsApp={mockOnShareWhatsApp}
        onShareLinkedIn={mockOnShareLinkedIn}
        onShareEmail={mockOnShareEmail}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls appropriate handlers when share buttons are clicked', () => {
    render(
      <ShareBanner
        isVisible={true}
        onClose={mockOnClose}
        onShare={mockOnShare}
        onShareWhatsApp={mockOnShareWhatsApp}
        onShareLinkedIn={mockOnShareLinkedIn}
        onShareEmail={mockOnShareEmail}
      />
    )

    fireEvent.click(screen.getByText('WhatsApp'))
    expect(mockOnShareWhatsApp).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('LinkedIn'))
    expect(mockOnShareLinkedIn).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('Email'))
    expect(mockOnShareEmail).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('More sharing options'))
    expect(mockOnShare).toHaveBeenCalledTimes(1)
  })
})
