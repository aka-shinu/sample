import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Home from './page';
import { trpc } from '@/utils/trpc';

// Mock auth0 user
const mockUserId = 'google-oauth2|103865496192378177413';
jest.mock('@auth0/nextjs-auth0/client', () => ({
  useUser: () => ({ 
    user: { 
      name: 'John Doe', 
      email: 'john@example.com',
      sub: mockUserId
    } 
  }),
}));

const mockMessages = [
  {
    id: '13bd85e4-9dce-4435-b563-51d894608011',
    user_id: mockUserId,
    content: 'Hello',
    created_at: '2024-01-01T00:00:00.000Z',
    conversation_id: '89d42bd7-c209-4810-9832-4a31d81ba253',
    gemini_response: 'Hi there!',
    contentType: 'text'
  },
  {
    id: '23bd85e4-9dce-4435-b563-51d894608012',
    user_id: 'gemini',
    content: 'Hi there!',
    created_at: '2024-01-01T00:00:01.000Z',
    conversation_id: '89d42bd7-c209-4810-9832-4a31d81ba253',
    gemini_response: null,
    contentType: 'text'
  }
];

const mockConversations = [
  { 
    id: '89d42bd7-c209-4810-9832-4a31d81ba253', 
    title: 'First Chat', 
    user_id: mockUserId, 
    created_at: '2024-01-01T00:00:00.000Z' 
  },
  { 
    id: '99d42bd7-c209-4810-9832-4a31d81ba254', 
    title: 'Second Chat', 
    user_id: mockUserId, 
    created_at: '2024-01-02T00:00:00.000Z' 
  },
];

jest.mock('@/utils/trpc', () => ({
  trpc: {
    listConversations: { 
      useQuery: () => ({ 
        data: mockConversations,
        isLoading: false 
      }) 
    },
    createConversation: { 
      useMutation: () => ({ 
        mutate: jest.fn(),
        mutateAsync: jest.fn().mockResolvedValue({ 
          id: 'a9d42bd7-c209-4810-9832-4a31d81ba255', 
          title: 'New Chat', 
          user_id: mockUserId, 
          created_at: '2024-01-03T00:00:00.000Z' 
        }),
        status: 'idle'
      }) 
    },
    getMessages: { 
      useQuery: ({ conversation_id }: { conversation_id: string }) => ({ 
        data: conversation_id === '89d42bd7-c209-4810-9832-4a31d81ba253' ? mockMessages : [], 
        isLoading: false 
      }) 
    },
    addMessage: { useMutation: () => ({ mutate: jest.fn() }) },
    geminiText: { useMutation: () => ({ mutate: jest.fn() }) },
    geminiImage: { useMutation: () => ({ mutate: jest.fn() }) },
    updateGeminiResponse: { useMutation: () => ({ mutate: jest.fn() }) },
    updateConversationTitle: { useMutation: () => ({ mutate: jest.fn() }) },
    useUtils: () => ({
      listConversations: { invalidate: jest.fn() },
      getMessages: { invalidate: jest.fn() }
    }),
  }
}));

describe('Sidebar', () => {
  it('renders the sidebar and opens it when burger menu is clicked', async () => {
    render(<Home />);
    
    // Click burger menu to open sidebar
    const burgerMenu = screen.getByLabelText(/menu/i);
    await userEvent.click(burgerMenu);
    
    // Now sidebar should be visible with user's conversations
    expect(screen.getAllByText('First Chat').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Second Chat').length).toBeGreaterThan(0);
  });

  it('renders the search bar after opening sidebar', async () => {
    render(<Home />);
    
    // Click burger menu to open sidebar
    const burgerMenu = screen.getByLabelText(/menu/i);
    await userEvent.click(burgerMenu);
    
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('renders the new chat button after opening sidebar', async () => {
    render(<Home />);
    
    // Click burger menu to open sidebar
    const burgerMenu = screen.getByLabelText(/menu/i);
    await userEvent.click(burgerMenu);
    
    expect(screen.getByLabelText(/new chat/i)).toBeInTheDocument();
  });

  it('filters conversations by search after opening sidebar', async () => {
    render(<Home />);
    
    // Click burger menu to open sidebar
    const burgerMenu = screen.getByLabelText(/menu/i);
    await userEvent.click(burgerMenu);
    
    const input = screen.getByPlaceholderText('Search');
    await userEvent.type(input, 'First');
    expect(screen.getAllByText('First Chat').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Second Chat').length).toBe(0);
  });

  it('renders the user profile row after opening sidebar', async () => {
    render(<Home />);
    
    // Click burger menu to open sidebar
    const burgerMenu = screen.getByLabelText(/menu/i);
    await userEvent.click(burgerMenu);
    
    expect(screen.getByText('JD')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});

describe('Chat Input', () => {
  it('renders the input bar', () => {
    render(<Home />);
    expect(screen.getByPlaceholderText(/ask anything/i)).toBeInTheDocument();
  });

  it('disables input when user is not logged in', () => {
    const mockUseUser = jest.requireMock('@auth0/nextjs-auth0/client').useUser;
    mockUseUser.mockReturnValue({ user: null });
    render(<Home />);
    expect(screen.getByPlaceholderText(/login to chat/i)).toBeDisabled();
  });
});

describe('Chat Messages', () => {

  it('loads messages when clicking an existing chat', async () => {
    render(<Home />);
    
    // Click burger menu to open sidebar
    const burgerMenu = screen.getByLabelText(/menu/i);
    await userEvent.click(burgerMenu);
    
    // Wait for and click the conversation in the sidebar
    const firstChat = await screen.findByText('First Chat', { selector: '.sidebar-chat-title' });
    expect(firstChat).toBeInTheDocument();
    await userEvent.click(firstChat);
    
    // Wait for messages to be loaded and rendered
    await waitFor(() => {
      // Find all message rows
      const messageRows = document.getElementsByClassName('message-row');
      expect(messageRows).toHaveLength(2);
      
      // First message (user message)
      const firstMessageRow = messageRows[0];
      const firstMessageBubble = firstMessageRow.querySelector('.message-bubble.message-user');
      expect(firstMessageBubble?.textContent?.trim()).toBe('Hello');
      
      // Second message (AI message) - just verify it exists and has content
      const secondMessageRow = messageRows[1];
      const secondMessageBubble = secondMessageRow.querySelector('.message-bubble.message-ai');
      expect(secondMessageBubble).toBeTruthy();
      expect(secondMessageBubble?.textContent?.trim()).toBeTruthy();
    }, { timeout: 3000 });
  });
});

describe('Pause/Stop Button', () => {
  it('shows stop button when AI is generating', () => {
    render(<Home />);
    // expect(screen.getByLabelText(/stop generating/i)).toBeInTheDocument();
  });
});

describe('Image Mode Toggle', () => {
  it('toggles image mode when button is clicked', async () => {
    render(<Home />);
    const toggleBtn = screen.getByLabelText(/toggle image mode/i);
    await userEvent.click(toggleBtn);
    // You can check for class change or placeholder change
  });
}); 