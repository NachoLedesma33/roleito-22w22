import { test as base, expect } from '@playwright/test';
import { API_BASE, Campaign, createCampaign, deleteCampaign } from '../helpers/api-helpers';

type Fixtures = {
  campaign: Campaign;
};

export const test = base.extend<Fixtures>({
  campaign: async ({ request }, use) => {
    const name = `E2E Campaign ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const campaign = await createCampaign(request, name);
    await use(campaign);
    await deleteCampaign(request, campaign.id);
  },
});

export { expect };
