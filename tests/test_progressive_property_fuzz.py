import random
import unittest


class ProgressiveAccountingPropertyTests(unittest.TestCase):
    def test_ten_thousand_randomized_lifecycle_accounting_sequences(self):
        rng = random.Random(0x5B0D)
        for _ in range(10_000):
            fee = rng.randint(1, 10**24)
            modules = rng.randint(2, 20)
            accepted = rng.randint(0, modules)
            released = 0
            payouts = []

            for index in range(accepted):
                target = fee * (index + 1) // modules
                tranche = target - released
                self.assertGreater(tranche, 0)
                payouts.append(tranche)
                released = target

            remaining = fee - released
            self.assertEqual(sum(payouts), released)
            self.assertEqual(released + remaining, fee)

            terminal = rng.choice(("cancel", "recovery", "rejected", "accepted"))
            organizer_paid, student_refunded = released, 0
            if accepted == modules:
                remaining = 0
            elif terminal in ("cancel", "rejected"):
                student_refunded += remaining
                remaining = 0
            elif terminal == "recovery":
                recovery_organizer = remaining // 2
                organizer_paid += recovery_organizer
                student_refunded += remaining - recovery_organizer
                remaining = 0
            else:
                organizer_paid += remaining
                remaining = 0

            self.assertEqual(organizer_paid + student_refunded + remaining, fee)
            self.assertLessEqual(organizer_paid, fee)
            self.assertLessEqual(student_refunded, fee)


if __name__ == "__main__":
    unittest.main()
